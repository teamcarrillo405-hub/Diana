"""Prepare only the approved immutable Qwen3-4B-Instruct-2507 snapshot.

No model execution, credentials, training data, or final evaluation is used.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import time
import urllib.parse
import urllib.request

MODEL = "Qwen/Qwen3-4B-Instruct-2507"
REVISION = "cdbee75f17c01a7cc42f958dc650907174af0554"
LICENSE = "apache-2.0"
# Publisher metadata verified from the official Qwen repository at this revision.
# Git objects use SHA1(blob header + bytes); LFS files use content SHA256.
FILES = {
    "LICENSE": (11343, "git-sha1", "6634c8cc3133b3848ec74b9f275acaaa1ea618ab"),
    "README.md": (8168, "git-sha1", "b85879f8e465b5b02bd7ea13dd7ffaf22816bf59"),
    "config.json": (727, "git-sha1", "6988f134db143052042f2bd6e0c897bc6a605189"),
    "generation_config.json": (238, "git-sha1", "432531a002c181a19de338313d2375e9d7494d7e"),
    "merges.txt": (1671839, "git-sha1", "20024bfe7c83998e9aeaf98a0cd6a2ce6306c2f0"),
    "model-00001-of-00003.safetensors": (3957900840, "sha256", "75311d91bb08cf0b882913da464a1e722a31fb44db35208663487efb7a3d8ed6"),
    "model-00002-of-00003.safetensors": (3987450520, "sha256", "0b48adbb1f60e901153d91907ba11ce63bd4b8b584482e730f48808d055dfba1"),
    "model-00003-of-00003.safetensors": (99630640, "sha256", "7dd39ccca5e4de123c74c14af44c9bf2eb75df33b4614382af0134528e060d5d"),
    "model.safetensors.index.json": (32819, "git-sha1", "4747b0297d3109f14db49886972e3369c9a00b2a"),
    "tokenizer.json": (11422654, "sha256", "aeb13307a71acd8fe81861d94ad54ab689df773318809eed3cbe794b4492dae4"),
    "tokenizer_config.json": (9377, "git-sha1", "51c1be0d9192e7f6e6596de71d0f07d58fbc32ac"),
    "vocab.json": (2776833, "git-sha1", "4783fe10ac3adce15ac8f358ef5462739852c569"),
}
TOTAL_BYTES = sum(record[0] for record in FILES.values())
RESEARCH_ROOT = Path(__file__).resolve().parents[2]/"artifacts/learning-engine/research"
DEFAULT_OUTPUT = RESEARCH_ROOT/"qwen3-4b-instruct-2507"
METADATA_URL = f"https://huggingface.co/api/models/{MODEL}/revision/{REVISION}?blobs=true"
ARCHITECTURE = {"model_type":"qwen3","num_hidden_layers":36,"hidden_size":2560,
                "num_attention_heads":32,"num_key_value_heads":8,"vocab_size":151936,
                "torch_dtype":"bfloat16","max_position_embeddings":262144}


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while block := handle.read(8*1024*1024):
            digest.update(block)
    return digest.hexdigest()


def safe_path(path):
    """Reject linked artifacts rather than writing through another location."""
    for part in (path, *path.parents):
        if part.is_symlink() or (hasattr(part,"is_junction") and part.is_junction()):
            raise ValueError("Linked artifact path rejected")
    if path.exists() and path.is_file() and path.stat().st_nlink != 1:
        raise ValueError("Hard-linked artifact rejected")


def output_path(path):
    path = path.absolute()
    safe_path(path)
    path = path.resolve()
    if not path.is_relative_to(RESEARCH_ROOT) or path == RESEARCH_ROOT:
        raise ValueError("Output must stay inside the repository research artifacts directory")
    return path


def approved_url(url):
    parts = urllib.parse.urlsplit(url)
    host = (parts.hostname or "").lower()
    allowed = host == "huggingface.co" or host.endswith(".huggingface.co") or host.endswith(".hf.co")
    if parts.scheme != "https" or parts.username or parts.password or parts.port not in (None,443) or not allowed:
        raise ValueError("Only HTTPS official Hugging Face download endpoints are allowed")
    return url


class PublisherRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        approved_url(newurl)
        return super().redirect_request(req,fp,code,msg,headers,newurl)


def opener():
    # No login, cookies, bearer tokens, or installed model-hub credential APIs.
    return urllib.request.build_opener(PublisherRedirect())


def validate_metadata(metadata):
    if metadata.get("id") != MODEL or metadata.get("sha") != REVISION or metadata.get("cardData",{}).get("license") != LICENSE:
        raise ValueError("Publisher model, revision or license mismatch")
    entries = {row["rfilename"]:row for row in metadata["siblings"]}
    for name,(size,kind,expected) in FILES.items():
        row=entries.get(name,{})
        actual=row.get("lfs",{}).get("sha256") if kind=="sha256" else row.get("blobId")
        if row.get("size") != size or actual != expected:
            raise ValueError("Publisher file metadata mismatch: "+name)
    return entries


def valid_file(path, spec):
    safe_path(path)
    size,kind,expected=spec
    if not path.is_file() or path.stat().st_size != size:
        return False
    if kind=="sha256":
        return sha256(path)==expected
    content=path.read_bytes()
    return hashlib.sha1(f"blob {len(content)}\0".encode()+content).hexdigest()==expected


def response_range(status, headers, offset, total):
    if offset:
        if status != 206:
            raise ValueError("Server did not honor resume range; partial file preserved")
        match=re.fullmatch(r"bytes (\d+)-(\d+)/(\d+)",headers.get("Content-Range", ""))
        if not match or int(match[1]) != offset or int(match[2]) != total-1 or int(match[3]) != total:
            raise ValueError("Unexpected resumed byte range")
    elif status != 200:
        raise ValueError("Unexpected initial download response")
    length=headers.get("Content-Length")
    if length is not None and int(length) != total-offset:
        raise ValueError("Unexpected download size")


def download_file(snapshot,name,transport=None):
    transport=transport or opener()
    path=snapshot/name
    partial=snapshot/(name+".partial")
    spec=FILES[name]
    total=spec[0]
    safe_path(path)
    safe_path(partial)
    if path.exists():
        if not valid_file(path,spec):
            raise ValueError("Existing final file failed validation; refusing overwrite: "+name)
        print(json.dumps({"file":name,"status":"already-verified"}),flush=True)
        return
    offset=partial.stat().st_size if partial.exists() else 0
    if offset>total:
        raise ValueError("Oversized partial file; refusing truncation")
    if offset<total:
        url=approved_url(f"https://huggingface.co/{MODEL}/resolve/{REVISION}/{name}")
        headers={"User-Agent":"Diana-approved-research-model-preparation/1","Accept-Encoding":"identity"}
        if offset:
            headers["Range"]=f"bytes={offset}-"
        request=urllib.request.Request(url,headers=headers)
        print(json.dumps({"file":name,"status":"downloading","resumeBytes":offset,"totalBytes":total}),flush=True)
        with transport.open(request,timeout=120) as response:
            approved_url(response.url)
            response_range(response.status,response.headers,offset,total)
            with partial.open("ab") as target:
                last_log=time.monotonic()
                while block:=response.read(min(8*1024*1024,total-offset+1)):
                    if offset+len(block)>total:
                        raise ValueError("Publisher response exceeded expected size")
                    target.write(block)
                    offset+=len(block)
                    if time.monotonic()-last_log>=15:
                        print(json.dumps({"file":name,"downloadedBytes":offset,"totalBytes":total}),flush=True)
                        last_log=time.monotonic()
                target.flush()
                os.fsync(target.fileno())
    if not valid_file(partial,spec):
        raise ValueError("Partial file incomplete or publisher hash mismatch; retained for inspection")
    partial.replace(path)
    print(json.dumps({"file":name,"status":"verified","bytes":total}),flush=True)


def validate_snapshot(root):
    root=output_path(root)
    snapshot=root/"model"/REVISION
    metadata=json.loads((root/"publisher-metadata.json").read_text(encoding="utf-8"))
    validate_metadata(metadata)
    for name,spec in FILES.items():
        if not valid_file(snapshot/name,spec):
            raise ValueError("Snapshot file verification failed: "+name)
    config=json.loads((snapshot/"config.json").read_text(encoding="utf-8"))
    if any(config.get(key)!=value for key,value in ARCHITECTURE.items()) or config.get("architectures")!=["Qwen3ForCausalLM"]:
        raise ValueError("Model architecture mismatch")
    index=json.loads((snapshot/"model.safetensors.index.json").read_text(encoding="utf-8"))
    shards={name for name in FILES if name.endswith(".safetensors")}
    if set(index.get("weight_map",{}).values())!=shards or not index.get("weight_map"):
        raise ValueError("Unexpected sharded weights index")
    license_text=(snapshot/"LICENSE").read_text(encoding="utf-8")
    if "Apache License" not in license_text or "Version 2.0" not in license_text:
        raise ValueError("Unexpected license text")
    return snapshot


def _prepare_unlocked(root, download=False):
    root=output_path(root)
    if not download:
        return {"model":MODEL,"revision":REVISION,"license":LICENSE,"totalBytes":TOTAL_BYTES,
                "output":str(root),"downloaded":False,"inferencePerformed":False,"trainingPerformed":False}
    root.mkdir(parents=True,exist_ok=True)
    metadata_path=root/"publisher-metadata.json"
    safe_path(metadata_path)
    if metadata_path.exists():
        metadata=json.loads(metadata_path.read_text(encoding="utf-8"))
    else:
        with opener().open(approved_url(METADATA_URL),timeout=60) as response:
            payload=response.read(2*1024*1024+1)
        if len(payload)>2*1024*1024:
            raise ValueError("Metadata exceeds size bound")
        metadata=json.loads(payload)
        validate_metadata(metadata)
        metadata_path.write_bytes(payload)
    validate_metadata(metadata)
    snapshot=root/"model"/REVISION
    safe_path(snapshot)
    snapshot.mkdir(parents=True,exist_ok=True)
    remaining=sum(max(0,size-((snapshot/(name+".partial")).stat().st_size if (snapshot/(name+".partial")).exists() else 0))
                  for name,(size,_,_) in FILES.items() if not (snapshot/name).exists())
    if shutil.disk_usage(root).free<remaining+512*1024*1024:
        raise ValueError("Insufficient disk space for the approved snapshot")
    for name in sorted(FILES):
        download_file(snapshot,name)
    validate_snapshot(root)
    record={"schema":"diana-qwen3-4b-preparation-v1","createdAt":datetime.now(timezone.utc).isoformat(),
            "model":MODEL,"revision":REVISION,"publisher":"Qwen","license":LICENSE,"metadataUrl":METADATA_URL,
            "metadataSha256":sha256(metadata_path),"architecture":ARCHITECTURE,"totalBytes":TOTAL_BYTES,
            "researchOnly":True,"productionEligible":False,"inferencePerformed":False,"trainingPerformed":False,
            "files":{name:{"bytes":size,"sha256":sha256(snapshot/name),"publisherHashType":kind,"publisherHash":expected}
                     for name,(size,kind,expected) in FILES.items()}}
    provenance=root/"model-provenance.json"
    safe_path(provenance)
    if provenance.exists():
        previous=json.loads(provenance.read_text(encoding="utf-8"))
        if any(previous.get(key)!=value for key,value in record.items() if key!="createdAt"):
            raise ValueError("Existing provenance differs; refusing overwrite")
        record=previous
    else:
        provenance.write_text(json.dumps(record,indent=2),encoding="utf-8")
    return {"model":MODEL,"revision":REVISION,"snapshot":str(snapshot),"totalBytes":TOTAL_BYTES,
            "provenanceSha256":sha256(provenance),"verified":True,"inferencePerformed":False,"trainingPerformed":False}


def prepare(root, download=False):
    root=output_path(root)
    if not download:
        return _prepare_unlocked(root,False)
    root.mkdir(parents=True,exist_ok=True)
    lock=root/"download.lock"
    safe_path(lock)
    # Never delete a preexisting lock or guess that another process is stale.
    with lock.open("x",encoding="utf-8") as handle:
        handle.write(json.dumps({"pid":os.getpid(),"model":MODEL,"revision":REVISION}))
        handle.flush()
        os.fsync(handle.fileno())
    try:
        return _prepare_unlocked(root,True)
    finally:
        safe_path(lock)
        lock.unlink()


if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",type=Path,default=DEFAULT_OUTPUT)
    group=parser.add_mutually_exclusive_group()
    group.add_argument("--download-official-model",action="store_true")
    group.add_argument("--verify-only",action="store_true")
    args=parser.parse_args()
    if args.verify_only:
        print(json.dumps({"verified":True,"snapshot":str(validate_snapshot(args.output)),"inferencePerformed":False,"trainingPerformed":False}))
    else:
        print(json.dumps(prepare(args.output,args.download_official_model)),flush=True)
