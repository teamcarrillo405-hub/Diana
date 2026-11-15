"""Prepare original synthetic CPU research data and verified official Qwen snapshot.

This path never accepts textbook or student inputs and creates no review receipt.
It is separate from the signed, permissioned-data training pipeline.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import urllib.request

MODEL = "Qwen/Qwen2.5-0.5B-Instruct"
REVISION = "7ae557604adf67be50417f59c2c2f167def9a775"
FILES = {"config.json", "generation_config.json", "model.safetensors", "tokenizer.json", "tokenizer_config.json", "vocab.json", "merges.txt", "LICENSE", "README.md"}
SYSTEM = (
    "You are Diana, a calm learning coach. Use only SOURCE. Reply with exactly two lines. "
    "Line 1: EVIDENCE: followed by a short exact quote from SOURCE. "
    "Line 2: NEXT: followed by one focused question that helps the learner take a next step. "
    "Do not solve the task or invent facts. If SOURCE lacks the needed evidence, use "
    "EVIDENCE: insufficient and NEXT: What source could help us check this?"
)


def rows():
    # Original machine-authored examples, created specifically for this experiment.
    # Family separation is explicit; no claim of educator validation is made.
    train = []
    for index, (number, total) in enumerate([(3, 11), (5, 14), (7, 19), (4, 13), (8, 22), (6, 17), (9, 24), (2, 15)]):
        source = f"The balance rule says subtract the same amount from both sides. The equation is x + {number} = {total}."
        train.append((f"train-equation-{index}", "inverse-addition", "math", source, "How can I start solving this equation?", "subtract the same amount from both sides", f"What happens if you subtract {number} from each side?"))
    for index, (name, detail) in enumerate([("Mira", "saved a seat for a friend"), ("Owen", "shared his lunch"), ("Lena", "returned a lost wallet"), ("Noah", "helped carry a heavy bag"), ("Asha", "listened while a friend spoke"), ("Jules", "repaired a neighbor's gate"), ("Ravi", "offered someone an umbrella"), ("Sofia", "walked a new student to class")]):
        source = f"{name} {detail}. The passage describes one action, and does not state a lasting personality trait."
        train.append((f"train-reading-{index}", "character-inference", "reading", source, "What evidence can support an inference about this character?", detail, "What might this action suggest, while leaving room for another explanation?"))
    for index, (changed, measured) in enumerate([("lamp distance", "plant height"), ("water temperature", "dissolving time"), ("ramp height", "travel distance"), ("soil type", "seedling count"), ("surface texture", "sliding distance"), ("salt amount", "freezing temperature"), ("string length", "swing time"), ("light duration", "leaf count")]):
        source = f"In this investigation, students changed {changed} and measured {measured}. They kept other conditions the same."
        train.append((f"train-science-{index}", "experimental-variables", "science", source, "How can I identify what the investigation measures?", f"measured {measured}", "Which quantity was observed rather than deliberately changed?"))
    for index, (source, question) in enumerate([
        ("The chart records rainfall for one town in May.", "What was the temperature in June?"),
        ("A passage describes a train arriving at noon.", "What did the driver eat for breakfast?"),
        ("The rectangle has a stated width of four units.", "What is its area without a length?"),
        ("A report counts seedlings after seven days.", "Which chemical caused the growth?"),
        ("A sentence says the door was open.", "Who opened the door?"),
        ("A table lists the masses of three rocks.", "How old is each rock?"),
        ("A number line marks the value six.", "What equation produced that value?"),
        ("The story takes place beside a river.", "Which country is the river in?"),
    ]):
        train.append((f"train-missing-{index}", "missing-{index}", "source-boundary", source, question, "insufficient", "What source could help us check this?"))
    heldout = [
        ("eval-percent", "percentage-part", "math", "A percent means a number out of one hundred. A class asks for twenty percent of forty counters.", "How should I represent this percent before calculating?", "out of one hundred", "How could you write twenty percent as a fraction?"),
        ("eval-area", "rectangle-area", "math", "A rectangle is six units long and three units wide. Its area counts unit squares covering the inside.", "How could I organize the squares without guessing?", "unit squares covering the inside", "How many rows and columns would cover this rectangle?"),
        ("eval-sequence", "sequence-causation", "reading", "The bell rang, then the lights went out. The passage gives an order of events without explaining a cause.", "Can I conclude the bell caused the outage?", "without explaining a cause", "What additional evidence would connect the events as cause and effect?"),
        ("eval-viewpoint", "narrator-viewpoint", "reading", "I waited beside the stage and wondered if my name would be called. Only the narrator's thoughts are stated.", "How can I identify the viewpoint?", "Only the narrator's thoughts are stated", "Whose thoughts can the reader directly access?"),
        ("eval-conservation", "closed-system-mass", "science", "In a sealed container, ice melts into liquid water. No matter enters or leaves the container.", "What should I consider when comparing the total mass?", "No matter enters or leaves", "Where could matter go if the container stays sealed?"),
        ("eval-graph", "graph-association", "science", "Two recorded quantities rise together in the observations. No controlled experiment was performed.", "Does this graph alone prove one quantity causes the other?", "No controlled experiment was performed", "What other explanations could produce the shared pattern?"),
        ("eval-missing-history", "unsupported-history", "history", "The museum label gives the pottery's color and width.", "Who made this pottery?", "insufficient", "What source could help us check this?"),
        ("eval-missing-science", "unsupported-mechanism", "science", "An observer counted twelve birds at a feeder on Tuesday.", "Which migration route did the birds follow?", "insufficient", "What source could help us check this?"),
    ]
    def convert(row):
        row_id, family, subject, source, question, quote, hint = row
        return {"id": row_id, "family": family, "subject": subject, "source": source, "question": question, "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": f"SOURCE: {source}\nQUESTION: {question}"}, {"role": "assistant", "content": f"EVIDENCE: {quote}\nNEXT: {hint}"}]}
    return [convert(row) for row in train], [convert(row) for row in heldout]


def sha(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(4 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def final_rows():
    """New test cases authored after the first run's over-abstention finding.

    They were fixed before the one conservative correction was trained. This is
    a small subsequent test, not an independently curated or blinded benchmark.
    """
    cases = [
        ("final-slope", "signed-linear-slope", "math", "A line passes through (1, 7) and (4, 1). Slope compares the change in y with the change in x.", "What should I compare before dividing?", "change in y with the change in x", "What is the change in each coordinate between the two points?"),
        ("final-mean", "arithmetic-mean", "math", "The recorded scores are two, five, and eight. The mean shares their total equally across three entries.", "How do I begin finding the mean?", "shares their total equally", "What total would you divide equally among the three entries?"),
        ("final-purpose", "author-purpose", "reading", "The poster asks readers to bring reusable bottles and explains how this reduces disposable waste.", "What wording could help me infer the author's purpose?", "asks readers to bring reusable bottles", "What action does the author want the reader to take?"),
        ("final-comparison", "textual-comparison", "reading", "The first account describes the room as silent. The second account describes people talking throughout the room.", "How can I begin comparing these accounts?", "silent", "How does the second account describe the sound in the same room?"),
        ("final-foodweb", "food-web-direction", "science", "An arrow runs from grass to a rabbit in this food web. Arrows show the direction that food energy moves.", "How should I interpret the arrow?", "direction that food energy moves", "Where does the arrow begin and where does it point?"),
        ("final-circuit", "circuit-continuity", "science", "A working circuit needs a continuous conducting path. In this drawing, the switch leaves a gap in the path.", "What feature of the drawing should I inspect first?", "continuous conducting path", "Where does the switch interrupt the conducting path?"),
        ("final-missing-date", "unsupported-date", "history", "The archive description records the letter's ink color and paper size.", "What year was this letter written?", "insufficient", "What source could help us check this?"),
        ("final-missing-speed", "unsupported-speed", "math", "A trip covers ninety kilometers. No travel time is recorded.", "What was the average speed?", "insufficient", "What source could help us check this?"),
    ]
    return [{"id": row_id, "family": family, "subject": subject, "source": source, "question": question, "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": f"SOURCE: {source}\nQUESTION: {question}"}, {"role": "assistant", "content": f"EVIDENCE: {quote}\nNEXT: {hint}"}]} for row_id, family, subject, source, question, quote, hint in cases]


def prepare(output: Path, download: bool, partition="development"):
    output.mkdir(parents=True, exist_ok=True)
    train, heldout = rows()
    if partition == "subsequent-test":
        heldout = final_rows()
    elif partition != "development":
        raise ValueError("Unknown research partition")
    assert not {row["family"] for row in train} & {row["family"] for row in heldout}
    manifest = {"schema": "diana-original-synthetic-lora-v1", "researchOnly": True, "productionEligible": False, "dataOrigin": "Original machine-authored educational fixtures created for this experiment; no student or textbook data", "partition": partition, "testAuthoredAfterInitialDevelopmentResult": partition == "subsequent-test", "educatorReviewed": False, "trainCount": len(train), "heldoutCount": len(heldout), "familyDisjoint": True, "semanticIndependenceProven": False, "files": {}}
    for name, records in [("train.jsonl", train), ("heldout.jsonl", heldout)]:
        path = output / name
        content = "".join(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n" for row in records)
        if path.exists() and path.read_text(encoding="utf-8") != content:
            raise ValueError("Refusing to replace existing experiment data")
        path.write_text(content, encoding="utf-8")
        manifest["files"][name] = sha(path)
    (output / "dataset-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    if not download:
        return
    api = f"https://huggingface.co/api/models/{MODEL}/revision/{REVISION}?blobs=true"
    with urllib.request.urlopen(api, timeout=60) as response:
        metadata = json.load(response)
    revision = metadata["sha"]
    if revision != REVISION:
        raise ValueError("Unexpected publisher revision")
    snapshot = output / "model" / revision
    snapshot.mkdir(parents=True, exist_ok=True)
    provenance = {"model": MODEL, "revision": revision, "publisher": "Qwen", "license": "apache-2.0", "metadataUrl": api, "files": {}}
    entries = {item["rfilename"]: item for item in metadata["siblings"]}
    for name in sorted(FILES):
        item = entries[name]
        expected_size = item["size"]
        path = snapshot / name
        expected = item.get("lfs", {}).get("sha256") or item["blobId"]
        def verified():
            if not path.exists() or path.stat().st_size != expected_size:
                return False
            if "lfs" in item:
                return sha(path) == expected
            content = path.read_bytes()
            return hashlib.sha1(f"blob {len(content)}\0".encode() + content).hexdigest() == expected
        if not verified():
            url = f"https://huggingface.co/{MODEL}/resolve/{revision}/{name}"
            print(f"Downloading {name}: {expected_size} bytes", flush=True)
            with urllib.request.urlopen(url, timeout=120) as response, path.open("wb") as target:
                while block := response.read(4 * 1024 * 1024):
                    target.write(block)
        if not verified():
            raise ValueError(f"Publisher content hash mismatch: {name}")
        provenance["files"][name] = {"sha256": sha(path), "bytes": expected_size, "publisherHash": expected}
    (output / "model-provenance.json").write_text(json.dumps(provenance, indent=2), encoding="utf-8")
    print(json.dumps({"dataset": str(output), "model": str(snapshot), "revision": revision}), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--download-official-model", action="store_true")
    parser.add_argument("--partition", choices=["development", "subsequent-test"], default="development")
    args = parser.parse_args()
    prepare(args.output.resolve(), args.download_official_model, args.partition)
