"""Build a blinded supplementary AI-review packet from verified local outputs."""
import argparse
import json
from pathlib import Path
import random
from prepare_synthetic_lora import sha
from verify_synthetic_lora_v2 import verify


def build(root):
    verification = verify(root)
    read = lambda name: json.loads((root/name).read_text(encoding="utf-8"))
    rows, baseline, adapter = read("test.json"), read("baseline-test.json"), read("adapter-test.json")
    positions = [0]*(len(rows)//2)+[1]*(len(rows)-len(rows)//2)
    random.Random(904127).shuffle(positions)
    cases, key = [], []
    for row, base, tuned, swap in zip(rows, baseline, adapter, positions, strict=True):
        outputs = [base["output"], tuned["output"]]
        if swap:
            outputs.reverse()
        cases.append({"id":row["id"],"source":row["source"],"question":row["question"],"responseA":outputs[0],"responseB":outputs[1]})
        key.append({"id":row["id"],"responseA":"adapter" if swap else "base","responseB":"base" if swap else "adapter"})
    packet = {"schema":"diana-blinded-synthetic-output-audit-v1","experimentReportSha256":verification["reportSha256"],
              "instructions":"Review only this packet until ratings are finalized. For each response, judge source fidelity, whether answering or abstaining is justified, whether the next question is useful and specific, and whether it invents facts or solves the learner task. Cite concrete errors. Do not infer an arm from A/B: positions are counterbalanced. This is supplementary AI review, not a qualified educator review or a blinded human study.",
              "intendedResponse":"A short exact SOURCE quote and one focused next-step question. If needed evidence is absent: EVIDENCE: insufficient and NEXT: What source could help us check this?",
              "noProductionAuthorization":True,"cases":cases}
    destination = root/"blinded-audit-packet.json"
    with destination.open("x",encoding="utf-8") as handle:
        json.dump(packet,handle,indent=2)
    with (root/"blinded-audit-key.json").open("x",encoding="utf-8") as handle:
        json.dump({"packetSha256":sha(destination),"cases":key},handle,indent=2)
    return {"packet":str(destination),"sha256":sha(destination),"cases":len(cases)}


if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--run",type=Path,required=True)
    print(json.dumps(build(parser.parse_args().run.resolve())))
