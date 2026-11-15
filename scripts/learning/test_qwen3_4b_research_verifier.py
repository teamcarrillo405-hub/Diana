from copy import deepcopy
import json
from pathlib import Path
import random
import struct
import tempfile
import unittest

import verify_qwen3_4b_research as verify


class VerifierContracts(unittest.TestCase):
    def generated_fixture(self):
        from train_qwen3_4b_research import score,aggregate
        class Tokenizer:
            def decode(self,ids,skip_special_tokens=True): return ''.join(chr(token) for token in ids)
        rows=[{'id':str(i),'source':'apples','expectedAbstention':False,'acceptedQuotes':['apples'],'nextStepAnchors':['apples']} for i in range(48)]
        output='EVIDENCE: apples\nNEXT: Which apples?'
        records=[{'id':row['id'],'output':output,'targetTokenLoss':.2,'targetTokens':5,
                  'generatedTokenIds':list(map(ord,output)),'diagnostics':score(output,row)} for row in rows]
        return records,rows,[{'targetTokens':5}]*48,Tokenizer(),score,aggregate

    def test_changed_raw_output_and_forged_diagnostics_rejected(self):
        fixture=list(self.generated_fixture())
        self.assertEqual(verify.check_generated_records(*fixture)['counts']['groundedCasePass'],48)
        fixture[0]=deepcopy(fixture[0])
        fixture[0][0]['output']='EVIDENCE: invented\nNEXT: Which apples?'
        with self.assertRaisesRegex(ValueError,'decoded'): verify.check_generated_records(*fixture)
        fixture[0][0]['generatedTokenIds']=list(map(ord,fixture[0][0]['output']))
        with self.assertRaisesRegex(ValueError,'fabrication'): verify.check_generated_records(*fixture)

    def test_generated_identity_and_target_accounting_rejected(self):
        fixture=list(self.generated_fixture())
        fixture[0]=list(reversed(fixture[0]))
        with self.assertRaises(ValueError): verify.check_generated_records(*fixture)
        fixture=list(self.generated_fixture())
        fixture[0][0]['targetTokens']=6
        with self.assertRaises(ValueError): verify.check_generated_records(*fixture)

    def test95_requires46_of48_and_nonregression(self):
        baseline={'cases':48,'targetTokenLoss':1.,'counts':{'falseAbstention':0,'unsupportedAnswer':12,'groundedCasePass':10}}
        candidate={'cases':48,'targetTokenLoss':.5,'counts':{'falseAbstention':0,'unsupportedAnswer':0,'groundedCasePass':45}}
        self.assertFalse(all(verify.required_gates(baseline,candidate).values()))
        candidate['counts']['groundedCasePass']=46
        self.assertTrue(all(verify.required_gates(baseline,candidate).values()))
        candidate['counts']['falseAbstention']=1
        self.assertFalse(all(verify.required_gates(baseline,candidate).values()))

    def test_perfect_baseline_is_not_forced_to_regress_or_improve(self):
        perfect={'cases':48,'targetTokenLoss':.1,'counts':{'falseAbstention':0,'unsupportedAnswer':0,'groundedCasePass':48}}
        self.assertTrue(all(verify.required_gates(perfect,perfect).values()))

    def test_duplicate_json_and_nonfinite_rejected(self):
        for text in ('{"a":1,"a":2}','{"loss":NaN}','{"loss":Infinity}'):
            with self.assertRaises(ValueError): verify.parse(text)
        for value in (True,-1,float('nan'),float('inf'),'0'):
            with self.assertRaises(ValueError): verify.finite(value,'loss')

    def encoded(self):
        return [{'prefix':[1,2],'full':[1,2,3,4],'labels':[-100,-100,3,4],'targetTokens':2} for _ in range(488)]

    def test_source_loss_and_target_count_forgery_rejected(self):
        records=self.encoded()
        self.assertEqual(verify.check_tokenization(records,[{}]*440,[{}]*48),1760)
        for field,value in (('labels',[1,2,3,4]),('targetTokens',3),('prefix',[1,2,3,4]),('full',[1,2,151936,4])):
            altered=deepcopy(records)
            altered[0][field]=value
            with self.assertRaises(ValueError): verify.check_tokenization(altered,[{}]*440,[{}]*48)

    def history(self):
        train=[{'id':str(i)} for i in range(440)]
        encoded=self.encoded()
        history=[]
        seen=0
        for epoch in (1,2):
            indices=list(range(440))
            random.Random(59177+epoch).shuffle(indices)
            for start in range(0,440,4):
                seen+=4
                history.append({'epoch':epoch,'optimizerStep':len(history)+1,'gradientNorm':.1,
                                'examples':[{'id':str(i),'loss':.2,'targetTokens':2} for i in indices[start:start+4]],
                                'examplesSeen':seen,'targetTokensSeen':seen*2})
        return history,train,encoded

    def test_rehashed_history_must_match_exact_examples_and_shuffle(self):
        history,train,encoded=self.history()
        self.assertEqual(verify.check_history(history,train,encoded),1760)
        changed=deepcopy(history)
        changed[0]['examples'][0]['id']=changed[0]['examples'][1]['id']
        with self.assertRaises(ValueError): verify.check_history(changed,train,encoded)
        changed=deepcopy(history)
        changed[-1]['targetTokensSeen']+=2
        with self.assertRaises(ValueError): verify.check_history(changed,train,encoded)
        with self.assertRaises(ValueError): verify.check_history(history[:-1],train,encoded)

    def write_weights(self,root,mutator=None):
        folder=root/'epoch-1'
        folder.mkdir()
        config={'peft_type':'LORA','task_type':'CAUSAL_LM','r':16,'lora_alpha':32,'lora_dropout':0.,'bias':'none',
                'target_modules':['q_proj','k_proj','v_proj','o_proj']}
        (folder/'adapter_config.json').write_text(json.dumps(config),encoding='utf-8')
        header={}
        offset=0
        for name,shape in verify.expected_tensors().items():
            length=shape[0]*shape[1]*4
            header[name]={'dtype':'F32','shape':shape,'data_offsets':[offset,offset+length]}
            offset+=length
        if mutator: mutator(header)
        payload=json.dumps(header).encode()
        with (folder/'adapter_model.safetensors').open('wb') as handle:
            handle.write(struct.pack('<Q',len(payload)))
            handle.write(payload)
            handle.seek(8+len(payload)+offset-1)
            handle.write(b'\0')

    def test_all36_layers_and_correct_gqa_dimensions_required(self):
        with tempfile.TemporaryDirectory() as name:
            root=Path(name)
            self.write_weights(root)
            verify.check_weights(root,1)
        first=next(iter(verify.expected_tensors()))
        for mutation in (lambda header:header.pop(first),
                         lambda header:header[first].update(shape=[16,896]),
                         lambda header:header[first].update(data_offsets=[4,163844])):
            with tempfile.TemporaryDirectory() as name:
                root=Path(name)
                self.write_weights(root,mutation)
                with self.assertRaises(ValueError): verify.check_weights(root,1)

    def test_frozen_base_parameters_cannot_be_training_claim(self):
        values={'names':{name:{'elements':shape[0]*shape[1],'dtype':'torch.float32'} for name,shape in verify.expected_tensors(True).items()},
                'trainable':11796480,'total':4034264576}
        verify.check_parameters(values,4022468096)
        changed=deepcopy(values)
        changed['total']=4034592256
        with self.assertRaises(ValueError): verify.check_parameters(changed,4022468096)
        values['names']['base_model.model.model.embed_tokens.weight']={'elements':1,'dtype':'torch.float32'}
        with self.assertRaises(ValueError): verify.check_parameters(values,4022468096)

    def base_fixture(self):
        config={'model_type':'qwen3','tie_word_embeddings':True,'attention_bias':False,
                'hidden_size':2,'intermediate_size':3,'num_attention_heads':2,'num_key_value_heads':1,
                'head_dim':1,'vocab_size':4,'num_hidden_layers':1}
        shapes={'model.embed_tokens.weight':[4,2],'model.norm.weight':[2]}
        for name,shape in {'self_attn.q_proj.weight':[2,2],'self_attn.k_proj.weight':[1,2],
                           'self_attn.v_proj.weight':[1,2],'self_attn.o_proj.weight':[2,2],
                           'self_attn.q_norm.weight':[1],'self_attn.k_norm.weight':[1],
                           'mlp.gate_proj.weight':[3,2],'mlp.up_proj.weight':[3,2],
                           'mlp.down_proj.weight':[2,3],'input_layernorm.weight':[2],
                           'post_attention_layernorm.weight':[2]}.items():
            shapes['model.layers.0.'+name]=shape
        header={}
        offset=0
        for name,shape in shapes.items():
            elements=shape[0] if len(shape)==1 else shape[0]*shape[1]
            header[name]={'shape':shape,'dtype':'BF16','data_offsets':[offset,offset+2*elements]}
            offset+=2*elements
        index={'metadata':{'total_size':999999},'weight_map':{name:'weights.safetensors' for name in header}}
        return config,index,{'weights.safetensors':(header,offset)}

    def test_publisher_index_size_is_not_parameter_count(self):
        config,index,shards=self.base_fixture()
        self.assertEqual(verify.check_base_headers(config,index,shards),46)
        index['metadata']['total_size']=1
        self.assertEqual(verify.check_base_headers(config,index,shards),46)
        config.update(hidden_size=2560,intermediate_size=9728,num_attention_heads=32,
                      num_key_value_heads=8,head_dim=128,vocab_size=151936,num_hidden_layers=36)
        # Independently calculated architecture total, counting tied embeddings once.
        shapes=verify.base_tensor_shapes(config)
        import math
        self.assertEqual(len(shapes),398)
        self.assertEqual(sum(math.prod(shape) for shape in shapes.values()),4022468096)
        self.assertNotIn('lm_head.weight',shapes)

    def test_missing_duplicated_or_malformed_base_weights_rejected(self):
        for kind in ('missing','extra_head','shape','offset','index_location','untied'):
            config,index,shards=self.base_fixture()
            header,payload=shards['weights.safetensors']
            key='model.layers.0.self_attn.q_norm.weight'
            if kind=='missing': header.pop(key)
            if kind=='extra_head': header['lm_head.weight']=deepcopy(header['model.embed_tokens.weight'])
            if kind=='shape': header[key]['shape']=[2]
            if kind=='offset': header[key]['data_offsets']=[0,2]
            if kind=='index_location': index['weight_map'][key]='missing.safetensors'
            if kind=='untied': config['tie_word_embeddings']=False
            with self.subTest(kind=kind),self.assertRaises(ValueError):
                verify.check_base_headers(config,index,shards)

    def test_artifact_escape_and_empty_manifest_rejected(self):
        with tempfile.TemporaryDirectory() as name:
            root=Path(name)
            (root/'file').write_text('content')
            for path in ('../file','/file','C:/file','folder\\file','./file'):
                with self.assertRaises(ValueError): verify.evidence(root,path)
            with self.assertRaises(ValueError): verify.manifest(root,{}, {'file'})
            with self.assertRaises(ValueError): verify.manifest(root,{'file':'0'*64},{'file'})

    def test_cpu_fallback_and_forged_gpu_rejected(self):
        actual={'python':'3.12.3','platform':'Linux-microsoft-standard-WSL2','device':'cuda:0','bf16Supported':True,
                'gpuName':'AMD Radeon AI PRO R9700','gpuArchitecture':'gfx1201','gpuTotalMemory':32*1024**3,
                'torchRuntime':'2.9.1+rocm7.2.1.gitff65f5bc','hip':'7.2.1','packages':{'torch':'2.9.1+rocm7.2.1.lw.gitff65f5bc',
                'transformers':'5.15.1','accelerate':'1.14.0','safetensors':'0.8.0','peft':'0.21.0','tokenizers':'0.22.2'},
                'processEnv':{'HSA_ENABLE_DXG_DETECTION':'1','LD_LIBRARY_PATH':'/opt/rocm-7.2.1/lib:/usr/lib/wsl/lib',
                              'PYTHONPATH':'approved-overlay','TORCH_BLAS_PREFER_HIPBLASLT':'0'}}
        contract={'schema':'diana-qwen3-rocm-environment-v1','approved':True,'environment':actual}
        verify.check_environment(actual,contract)
        for field,value in (('device','cpu'),('gpuArchitecture','gfx000'),('gpuTotalMemory',4*1024**3),('bf16Supported',False)):
            changed=deepcopy(actual)
            changed[field]=value
            matching={'schema':'diana-qwen3-rocm-environment-v1','approved':True,'environment':changed}
            with self.assertRaises(ValueError): verify.check_environment(changed,matching)


if __name__=='__main__': unittest.main()
