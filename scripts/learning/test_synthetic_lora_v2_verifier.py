import json
from pathlib import Path
import tempfile
import unittest
from prepare_synthetic_lora import sha
from synthetic_lora_v2_data import datasets
from train_synthetic_lora_v2 import score, aggregate, gates
from verify_synthetic_lora_v2 import verify


class EvidenceVerifier(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.row = datasets()[2][0]
        def entry(text,loss):
            return {"id":self.row["id"],"output":text,"targetTokenLoss":loss,"targetTokens":20,"diagnostics":score(text,self.row)}
        base = [entry("EVIDENCE: invented\nNEXT: What do you think?",2.)]
        adapted = [entry(self.row["messages"][-1]["content"],1.)]
        for name in ("train","validation","test"):
            self.write(name+".json",[self.row])
        for name,value in (("baseline-test",base),("baseline-validation",base),("adapter-test",adapted),("reload-test",adapted),("epoch-1-validation",adapted)):
            self.write(name+".json",value)
        self.write("preregistration.json",{"productionEligible":False,"freshTestEvaluations":1,"sourceSha256":{},"dataSha256":{name:sha(self.root/(name+".json")) for name in ("train","validation","test")}})
        (self.root/"source").mkdir()
        metric_base,metric_adapter=aggregate(base),aggregate(adapted)
        self.write("selection.json",{"selectedEpoch":1,"validationPassed":True,"candidates":[{"epoch":1,"metrics":metric_adapter,"gates":gates(metric_base,metric_adapter)}]})
        self.report={"status":"completed","productionEligible":False,"educatorReviewed":False,"baseline":metric_base,"adapter":metric_adapter,"testGates":gates(metric_base,metric_adapter),"selectedEpoch":1,"savedAdapterOutputsIdentical":True,"syntheticQualityGatePassed":True,"artifactHashes":{p.name:sha(p) for p in self.root.iterdir() if p.is_file()}}
        self.write("report.json",self.report)

    def write(self,name,value):
        (self.root/name).write_text(json.dumps(value),encoding="utf-8")

    def test_valid_diagnostics_never_enable_production(self):
        self.assertTrue(verify(self.root)["syntheticQualityGatePassed"])
        self.assertFalse(verify(self.root)["productionEligible"])

    def test_production_or_educator_claim_is_rejected(self):
        self.report["productionEligible"]=True
        self.write("report.json",self.report)
        with self.assertRaisesRegex(ValueError,"research-only"):
            verify(self.root)

    def test_modified_evidence_is_rejected(self):
        self.write("adapter-test.json",[])
        with self.assertRaisesRegex(ValueError,"modified evidence"):
            verify(self.root)

    def test_rehashed_false_diagnostics_are_rejected(self):
        records=json.loads((self.root/"adapter-test.json").read_text())
        records[0]["output"]="EVIDENCE: invented\nNEXT: What do you think?"
        self.write("adapter-test.json",records)
        self.report["artifactHashes"]["adapter-test.json"]=sha(self.root/"adapter-test.json")
        self.write("report.json",self.report)
        with self.assertRaisesRegex(ValueError,"diagnostics"):
            verify(self.root)

    def test_escape_path_is_rejected(self):
        self.report["artifactHashes"]["../outside.json"]="0"*64
        self.write("report.json",self.report)
        with self.assertRaisesRegex(ValueError,"escaping"):
            verify(self.root)


if __name__=="__main__":
    unittest.main()
