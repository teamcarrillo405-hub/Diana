from copy import deepcopy
import json
from pathlib import Path
import random
import tempfile
import unittest

import verify_qwen3_grounding_revision as verify


class RevisionVerifierContracts(unittest.TestCase):
    def test_recorded_parent_maps_windows_and_wsl_to_same_local_sibling(self):
        windows=r'C:\Users\test\research\qwen3-run-006'
        wsl='/mnt/c/Users/test/research/qwen3-run-006'
        verify.check_parent_path(wsl,windows)
        verify.check_parent_path(windows,wsl)
        verify.check_parent_path(windows,windows)
        verify.check_parent_path(wsl,wsl)
        verify.check_parent_path('/home/test/research/qwen3-run-006','/home/test/research/qwen3-run-006')
        for invalid in ('research/qwen3-run-006','C:research/qwen3-run-006',
                        '/mnt/c/Users/test/../research/qwen3-run-006',
                        r'C:\Users\test\.\research\qwen3-run-006',
                        '/mnt/c/Users/other/research/qwen3-run-006',
                        '/mnt/d/Users/test/research/qwen3-run-006',
                        '/home/test/research/qwen3-run-006',
                        '/mnt/c//Users/test/research/qwen3-run-006',
                        '//server/share/qwen3-run-006'):
            with self.subTest(path=invalid),self.assertRaises(ValueError):
                verify.check_parent_path(invalid,windows)

    def training(self):
        rows=[]
        for partition in range(2):
            for subject in range(5):
                for context in range(20):
                    source=f'Partition {partition} subject {subject} context {context}: The recorded value is seven.'
                    for question in range(3):
                        insufficient=(question+(context%2))%2==0
                        rows.append({'id':f'{partition}-{subject}-{context}-{question}','subject':f'subject{subject}',
                                     'source':source,'question':f'Question {question}: Which value?',
                                     'expectedAbstention':insufficient,'acceptedQuotes':[] if insufficient else [source],
                                     'nextStepAnchors':['value'],
                                     'target':f'EVIDENCE: {"insufficient" if insufficient else source}\nNEXT: Which value could we check?'})
        return rows

    def test_training_requires_balanced_distinct_independent_contexts(self):
        train=self.training()
        verify.check_training(train,[])
        for mutation in ('id','question','context','subject','answerability','target'):
            changed=deepcopy(train)
            if mutation=='id': changed[0]['id']=changed[1]['id']
            if mutation=='question': changed[0]['question']=changed[1]['question']
            if mutation=='context': changed[0]['source']=changed[3]['source']
            if mutation=='subject': changed[0]['subject']='extra'
            if mutation=='answerability': changed[0]['expectedAbstention']=not changed[0]['expectedAbstention']
            if mutation=='target': changed[0]['target']='EVIDENCE: invented\nNEXT: Which value?'
            with self.subTest(mutation=mutation),self.assertRaises(ValueError): verify.check_training(changed,[])
        with self.assertRaises(ValueError): verify.check_training(train,[{'id':'new','source':train[0]['source']}])
        with self.assertRaises(ValueError): verify.check_training(train,[{'id':train[0]['id'],'source':'unrelated'}])

    def test_formal_gate_is_not_old_lexical_or_semantic_acceptance(self):
        base={'cases':48,'targetTokenLoss':2.}
        candidate={'cases':48,'targetTokenLoss':1.,'counts':{'groundedCasePass':0},
                   'formalCounts':{'correctAnswerability':46,'exactQuoteOrWarrantedAbstention':46,
                                   'twoLinesAndOneQuestion':46,'unsupportedAnswer':0}}
        self.assertTrue(all(verify.required_gates(base,candidate).values()))
        for key in ('correctAnswerability','exactQuoteOrWarrantedAbstention','twoLinesAndOneQuestion'):
            changed=deepcopy(candidate)
            changed['formalCounts'][key]=45
            self.assertFalse(all(verify.required_gates(base,changed).values()))
        changed=deepcopy(candidate)
        changed['formalCounts']['unsupportedAnswer']=1
        self.assertFalse(all(verify.required_gates(base,changed).values()))
        candidate['targetTokenLoss']=2.01
        self.assertFalse(all(verify.required_gates(base,candidate).values()))
        candidate['formalCounts']['correctAnswerability']=49
        with self.assertRaises(ValueError): verify.required_gates(base,candidate)

    def test_automatic_eligibility_never_authorizes_semantic_or_production_claim(self):
        record={'automaticEligibilityPassed':True,'productionEligible':False,'testOpened':False,
                'testEvaluations':0,'validationPassed':False,'semanticQualityValidated':False}
        verify.boundaries(record,validation=True)
        for key in ('validationPassed','semanticQualityValidated','productionEligible','testOpened','testEvaluations'):
            changed={**record,key:True}
            with self.subTest(key=key),self.assertRaises(ValueError): verify.boundaries(changed,validation=True)

    def test_recomputed_formal_counts_require_warranted_abstention(self):
        from train_qwen3_4b_research import score
        rows=self.training()[:48]
        records=[{'id':row['id'],'output':row['target'],'targetTokens':2,'targetTokenLoss':1.,
                  'diagnostics':score(row['target'],row)} for row in rows]
        result=verify.aggregate(records,rows)
        self.assertEqual(result['formalCounts']['correctAnswerability'],48)
        self.assertEqual(result['slices']['supported']['cases'],24)
        self.assertEqual(result['slices']['insufficient']['cases'],24)
        # A verbatim quote is insufficient when the question cannot be answered.
        records[0]['output']=f"EVIDENCE: {rows[0]['source']}\nNEXT: Which value could we check?"
        records[0]['diagnostics']=score(records[0]['output'],rows[0])
        result=verify.aggregate(records,rows)
        self.assertEqual(result['formalCounts']['unsupportedAnswer'],1)
        self.assertEqual(result['formalCounts']['exactQuoteOrWarrantedAbstention'],47)

    def audit_fixture(self,root):
        rows=self.training()
        (root/'source').mkdir()
        for name in verify.DATA_MODULES: (root/'source'/name).write_text('synthetic test source',encoding='utf-8')
        (root/'audit-evidence').mkdir()
        (root/'audit-evidence/0-review.json').write_text('{"syntheticFixture":true}',encoding='utf-8')
        hashed=verify.digest(root/'audit-evidence/0-review.json')
        (root/'audit-evidence-manifest.json').write_text(json.dumps({'audit-evidence/0-review.json':{
            'originalPath':'/approved/review.json','sha256':hashed}}),encoding='utf-8')
        audit={'schema':'diana-qwen3-training-revision-audit-v1','approvedForTraining':True,'independentReviewer':True,
               'educatorReviewed':False,'unresolvedFindings':[],'trainingCanonicalSha256':verify.canonical(rows),
               'sourceSha256':{name:verify.digest(root/'source'/name) for name in verify.DATA_MODULES},
               'caseReviews':[{'id':row['id'],'passed':True} for row in rows],
               'evidenceFiles':{'/approved/review.json':hashed}}
        return audit,rows

    def test_full_audit_coverage_hashes_and_honest_reviewer_status_required(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            audit,rows=self.audit_fixture(root)
            self.assertEqual(verify.check_audit(root,audit,rows),{'audit-evidence/0-review.json'})
            for mutation in ('duplicate','omission','rejection','data','source','educator','unresolved','independence'):
                changed=deepcopy(audit)
                if mutation=='duplicate': changed['caseReviews'][0]=changed['caseReviews'][1]
                if mutation=='omission': changed['caseReviews'].pop()
                if mutation=='rejection': changed['caseReviews'][0]['passed']=False
                if mutation=='data': changed['trainingCanonicalSha256']='0'*64
                if mutation=='source': changed['sourceSha256']={}
                if mutation=='educator': changed['educatorReviewed']=True
                if mutation=='unresolved': changed['unresolvedFindings']=['unresolved']
                if mutation=='independence': changed['independentReviewer']=False
                with self.subTest(mutation=mutation),self.assertRaises(ValueError): verify.check_audit(root,changed,rows)
            (root/'audit-evidence/0-review.json').write_text('changed',encoding='utf-8')
            with self.assertRaises(ValueError): verify.check_audit(root,audit,rows)

    def encoded(self):
        return [{'prefix':[1,2],'full':[1,2,3,4],'labels':[-100,-100,3,4],'targetTokens':2} for _ in range(648)]

    def test_masking_count_and768_token_budget(self):
        encoded=self.encoded()
        self.assertEqual(verify.check_tokenization(encoded,[{}]*600,[{}]*48),2400)
        for field,value in (('labels',[1,2,3,4]),('targetTokens',3),('prefix',[1,2,3,4]),('full',[1,2,151936,4])):
            changed=deepcopy(encoded)
            changed[0][field]=value
            with self.assertRaises(ValueError): verify.check_tokenization(changed,[{}]*600,[{}]*48)
        changed=deepcopy(encoded)
        changed[0]={'prefix':[1]*641,'full':[1]*642,'labels':[-100]*641+[1],'targetTokens':1}
        with self.assertRaises(ValueError): verify.check_tokenization(changed,[{}]*600,[{}]*48)

    def test300_steps_exact_shuffle_and_token_accounting(self):
        train=self.training()
        encoded=self.encoded()
        history=[]
        seen=0
        for epoch in (1,2):
            order=list(range(600))
            random.Random(69177+epoch).shuffle(order)
            for start in range(0,600,4):
                seen+=4
                history.append({'epoch':epoch,'optimizerStep':len(history)+1,'gradientNorm':1.,
                                'examplesSeen':seen,'targetTokensSeen':seen*2,
                                'examples':[{'id':train[i]['id'],'targetTokens':2,'loss':.2} for i in order[start:start+4]]})
        self.assertEqual(verify.check_history(history,train,encoded),2400)
        with self.assertRaises(ValueError): verify.check_history(history[:-1],train,encoded)
        changed=deepcopy(history)
        changed[0]['examples'][0]['id']=changed[0]['examples'][1]['id']
        with self.assertRaises(ValueError): verify.check_history(changed,train,encoded)
        changed=deepcopy(history)
        changed[-1]['targetTokensSeen']+=1
        with self.assertRaises(ValueError): verify.check_history(changed,train,encoded)

    def test_parent_reproduction_requires_full_identity(self):
        original=[{'id':str(i),'output':'text','generatedTokenIds':[1,2],'targetTokens':4} for i in range(48)]
        verify.identical(original,deepcopy(original))
        for key,value in (('id','other'),('output','changed'),('generatedTokenIds',[1,3]),('targetTokens',5)):
            changed=deepcopy(original)
            changed[0][key]=value
            with self.subTest(key=key),self.assertRaises(ValueError): verify.identical(original,changed)
        with self.assertRaises(ValueError): verify.identical(original,original[:-1])


if __name__=='__main__': unittest.main()
