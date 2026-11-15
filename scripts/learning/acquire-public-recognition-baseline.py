"""Acquire a fixed CC BY public recognition baseline. No models or inference.

The selection protocol must exist first. Network reads are bounded and all output
files are exclusive. A failed acquisition remains visible; reruns use a new root.
"""
from __future__ import annotations

import hashlib
import io
import json
from pathlib import Path
import struct
import sys
import urllib.request
import wave
import zipfile
import zlib
from datetime import datetime, timezone


def digest(data):
    return hashlib.sha256(data).hexdigest()


def save(root, name, data):
    target = root / name
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("xb") as stream:
        stream.write(data)
    return {"path": name, "sha256": digest(data), "bytes": len(data)}


def fetch(url, bound=5_000_000):
    request = urllib.request.Request(url, headers={"User-Agent": "DianaRecognitionResearch/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        data = response.read(bound + 1)
    if len(data) > bound:
        raise ValueError("download_bound")
    return data


def fetch_test_zip(root, url):
    # Only the first ZIP entry (test_data.zip), not the 724 MB train archive.
    request = urllib.request.Request(url, headers={"Range": "bytes=0-286039445"})
    raw_hash, uncompressed_hash, crc = hashlib.sha256(), hashlib.sha256(), 0
    count, written = 0, 0
    with urllib.request.urlopen(request, timeout=60) as response:
        if response.status != 206 or response.headers.get("Content-Range") != "bytes 0-286039445/1010143400":
            raise ValueError("archive_range_changed")
        header = response.read(30)
        fields = struct.unpack("<4s5H3L2H", header)
        name = response.read(fields[-2])
        extra = response.read(fields[-1])
        if fields[0] != b"PK\x03\x04" or fields[3] != 8 or name != b"test_data.zip":
            raise ValueError("archive_header_changed")
        raw_hash.update(header + name + extra)
        count += len(header) + len(name) + len(extra)
        compressed_remaining = 286039365
        decoder = zlib.decompressobj(-15)
        with (root / "source-test_data.zip").open("xb") as output:
            while compressed_remaining:
                block = response.read(min(1_048_576, compressed_remaining))
                if not block:
                    raise ValueError("truncated_archive")
                raw_hash.update(block)
                count += len(block)
                compressed_remaining -= len(block)
                decoded = decoder.decompress(block, 4_194_304)
                if decoder.unconsumed_tail:
                    raise ValueError("archive_expansion_bound")
                written += len(decoded)
                if written > 285995725:
                    raise ValueError("archive_size_changed")
                output.write(decoded)
                uncompressed_hash.update(decoded)
                crc = zlib.crc32(decoded, crc)
            tail = response.read(100)
            raw_hash.update(tail)
            count += len(tail)
        if not decoder.eof or written != 285995725 or crc != 1897843626 or count != 286039446:
            raise ValueError("archive_integrity_changed")
    return {"url": url, "range": "bytes=0-286039445", "archiveTotalBytes": 1010143400,
            "downloadedBytes": count, "rangeSha256": raw_hash.hexdigest(),
            "testZipSha256": uncompressed_hash.hexdigest(), "testZipBytes": written,
            "testZipCrc32": crc, "publisherChecksumAvailable": False}


def acquire(root):
    protocol_bytes = (root / "selection-protocol.json").read_bytes()
    protocol = json.loads(protocol_bytes)
    evidence = {"protocolSha256": digest(protocol_bytes), "startedAt": datetime.now(timezone.utc).isoformat(),
                "sources": [], "cases": [], "failures": []}
    sources = {
        "librispeech-source.html": "https://www.openslr.org/12",
        "librispeech-card.md": "https://huggingface.co/datasets/openslr/librispeech_asr/raw/71cacbfb7e2354c4226d01e70d77d5fca3d04ba1/README.md",
        "gnhk-publisher-readme.md": "https://raw.githubusercontent.com/GoodNotes/GNHK-dataset/main/README.md",
        "gnhk-license.txt": "https://raw.githubusercontent.com/GoodNotes/GNHK-dataset/main/LICENSE",
        "cc-by-4.0-legalcode.txt": "https://creativecommons.org/licenses/by/4.0/legalcode.txt",
    }
    for name, url in sources.items():
        evidence["sources"].append({"url": url, **save(root, "rights/" + name, fetch(url))})
    for split, indices in protocol["speech"]["selection"].items():
        for index in indices:
            case = {"caseId": f"librispeech-{split}-{index}", "kind": "speech", "stratum": split,
                    "license": "CC-BY-4.0", "datasetRevision": protocol["speech"]["revision"], "rowIndex": index}
            evidence["cases"].append(case)
            try:
                url = f"https://datasets-server.huggingface.co/rows?dataset=openslr/librispeech_asr&config=all&split={split}&offset={index}&length=1"
                row_bytes = fetch(url)
                result = json.loads(row_bytes)
                row_entry = result["rows"][0]
                row = row_entry["row"]
                source = row["audio"][0]["src"]
                if row_entry["row_idx"] != index or row_entry["truncated_cells"] or f"/--/{case['datasetRevision']}/--/" not in source:
                    raise ValueError("dataset_revision_or_row_changed")
                # Signed public CDN URLs are temporary; source path and response hash suffice.
                row["audio"][0]["src"] = source.split("?")[0]
                case.update(sourceId=row["id"], speakerId=row["speaker_id"], chapterId=row["chapter_id"], reference=row["text"], referenceSha256=digest(row["text"].encode()))
                case["sourceMetadata"] = save(root, "sources/" + case["caseId"] + ".json", json.dumps(result, indent=2).encode())
                flac = fetch(source)
                case["sourceAsset"] = save(root, "sources/" + case["caseId"] + ".flac", flac)
                import av
                with av.open(io.BytesIO(flac)) as audio:
                    frames = list(audio.decode(audio=0))
                if not frames or any(frame.sample_rate != 16000 or len(frame.layout.channels) != 1 or frame.format.name not in ("s16", "s16p") for frame in frames):
                    raise ValueError("unexpected_flac_format")
                pcm = b"".join(frame.to_ndarray().astype("<i2", copy=False).tobytes() for frame in frames)
                wav_bytes = io.BytesIO()
                with wave.open(wav_bytes, "wb") as wav:
                    wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(16000); wav.writeframes(pcm)
                case.update(asset=save(root, "assets/" + case["caseId"] + ".wav", wav_bytes.getvalue()), mime="audio/wav", durationSeconds=len(pcm) / 32000, acquisitionStatus="ready")
            except Exception as error:
                case.update(acquisitionStatus="unavailable", error=type(error).__name__ + ":" + str(error))
            print(case["caseId"], case["acquisitionStatus"], flush=True)
    url = "https://huggingface.co/datasets/staghado/GNHK-Dataset/resolve/eaa67d396fd29b8b04e38d630da79f67db11b212/GNHK-dataset.zip"
    evidence["handwritingArchive"] = fetch_test_zip(root, url)
    with zipfile.ZipFile(root / "source-test_data.zip") as archive:
        for region in ["AF", "AS", "EU", "NA"]:
            annotation_name = sorted(n for n in archive.namelist() if n.startswith("test/eng_" + region + "_") and n.endswith(".json"))[0]
            annotation_bytes = archive.read(annotation_name)
            image_name = annotation_name[:-5] + ".jpg"
            if archive.getinfo(image_name).file_size > 30_000_000:
                raise ValueError("source_image_bound")
            image_bytes = archive.read(image_name)
            evidence["sources"].extend([save(root, "sources/" + Path(annotation_name).name, annotation_bytes), save(root, "sources/" + Path(image_name).name, image_bytes)])
            annotations = json.loads(annotation_bytes)
            # Preserve raw annotations. Cropping is a separate deterministic local phase.
            evidence.setdefault("handwritingDocuments", []).append({"region": region, "annotation": annotation_name, "image": image_name,
                "annotationSha256": digest(annotation_bytes), "imageSha256": digest(image_bytes)})
            print("handwriting", region, annotation_name, "annotation-type", type(annotations).__name__, "first-keys", list(annotations[0]) if isinstance(annotations, list) else list(annotations), flush=True)
    evidence["completedAt"] = datetime.now(timezone.utc).isoformat()
    save(root, "acquisition.json", (json.dumps(evidence, indent=2) + "\n").encode())


if __name__ == "__main__":
    acquire(Path(sys.argv[1]).resolve(strict=True))
