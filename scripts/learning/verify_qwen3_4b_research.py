"""Independent, read-only verification of the Qwen3 development experiment.

No model inference or final evaluation loader is present. Hashes prove local
evidence consistency, not a third-party attestation of physical execution.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path, PurePosixPath
import random
import re
import struct

MODEL="Qwen/Qwen3-4B-Instruct-2507"
REVISION="cdbee75f17c01a7cc42f958dc650907174af0554"
PROVENANCE_SHA="fb8aad829c9a523351518c3f214cfb7ede0eaca44558f97d238778db9a826a3b"
CONTRACT_CANONICAL_SHA="362fcf1e7e890e74f196ef37fe649386ef9dc1caed1ee7eb77cf9563d90c8f9b"
QUALIFICATION_SHA="c6486baf20db3a7c56aa92806804c4c63bcbdd044c4dc372134e7ae3074d34f2"
DATA_HASHES={"train":"d4795d83e6ff042480f4977a3ce327d91c11f47314ddb10f32b0af59f71281c1",
             "development":"a76d8bcb1735b9b721308cd925dfa187d44af4481c799307971e82e9f2b3aad5"}
SYSTEM_HASH="2b798212676eaaab2fe682a35bd36391067a4e18e2e4e56b603b66267a7e1db1"
SETTINGS={"epochs":2,"learningRate":.00005,"rank":16,"alpha":32,
          "gradientAccumulation":4,"batchSize":1,"seed":59177,"gradientClip":1.,"weightDecay":.01,
          "maxSequence":512,"maxNewTokens":128,"maxSeconds":7200,"threads":4,
          "targetModules":["q_proj","k_proj","v_proj","o_proj"],"dropout":0.,"dtype":"bfloat16",
          "optimizer":"AdamW","gradientCheckpointing":True,"attentionImplementation":"eager",
          "groundedAccuracyThreshold":.95,"decoding":"greedy"}
SOURCES={"train_qwen3_4b_research.py","prepare_qwen3_4b_research.py",
         "synthetic_lora_v4_development.py","synthetic_lora_v4_data.py","synthetic_lora_v3_data.py"}
SHA=re.compile(r"[0-9a-f]{64}")


def require(condition,message):
    if not condition: raise ValueError(message)


def digest(path):
    value=hashlib.sha256()
    with path.open('rb') as stream:
        while block:=stream.read(8*1024*1024): value.update(block)
    return value.hexdigest()


def canonical(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode()).hexdigest()


def parse(text):
    def constant(value): raise ValueError('Nonfinite JSON value: '+value)
    def pairs(items):
        result={}
        for key,value in items:
            require(key not in result,'Duplicate JSON key')
            result[key]=value
        return result
    return json.loads(text,parse_constant=constant,object_pairs_hook=pairs)


def read(path): return parse(path.read_text(encoding='utf-8'))
def read_lines(path): return [parse(line) for line in path.read_text(encoding='utf-8').splitlines() if line.strip()]


def evidence(root,name):
    require(isinstance(name,str) and name and str(PurePosixPath(name))==name and not PurePosixPath(name).is_absolute()
            and '..' not in PurePosixPath(name).parts and '\\' not in name and ':' not in name,'Noncanonical evidence path')
    result=root.joinpath(*PurePosixPath(name).parts)
    require(result.resolve().is_relative_to(root.resolve()),'Escaping evidence path')
    for part in (result,*result.parents):
        require(not part.is_symlink() and not (hasattr(part,'is_junction') and part.is_junction()),'Linked evidence path')
    require(result.is_file() and result.stat().st_nlink==1,'Missing or hard-linked evidence')
    return result


def manifest(root,values,expected):
    require(isinstance(values,dict) and set(values)==set(expected),'Incomplete or unexpected artifact inventory')
    for name,hashed in values.items():
        require(isinstance(hashed,str) and SHA.fullmatch(hashed),'Invalid artifact hash')
        require(digest(evidence(root,name))==hashed,'Artifact content drift: '+name)


def finite(value,label):
    require(type(value) in (int,float) and math.isfinite(value) and value>=0,'Invalid '+label)


def required_gates(base,adapted):
    require(base['cases']==48==adapted['cases'],'Gate population drift')
    return {'lossNonRegression':adapted['targetTokenLoss']<=base['targetTokenLoss'],
            'falseAbstentionNonRegression':adapted['counts']['falseAbstention']<=base['counts']['falseAbstention'],
            'unsupportedAnswerNonRegression':adapted['counts']['unsupportedAnswer']<=base['counts']['unsupportedAnswer'],
            'groundingNonRegression':adapted['counts']['groundedCasePass']>=base['counts']['groundedCasePass'],
            'groundingAtLeast95Percent':adapted['counts']['groundedCasePass']*100>=95*48}


def check_environment(actual,contract):
    require(contract.get('schema')=='diana-qwen3-rocm-environment-v1' and contract.get('approved') is True
            and actual==contract.get('environment'),'Unreviewed environment contract')
    require(actual.get('python')=='3.12.3' and 'microsoft' in actual.get('platform','').lower(),'Unexpected WSL Python platform')
    require(actual.get('device')=='cuda:0' and actual.get('bf16Supported') is True,'BF16 GPU execution required')
    require('R9700' in actual.get('gpuName','') and actual.get('gpuArchitecture','').startswith('gfx1201'),'Unexpected GPU')
    require(type(actual.get('gpuTotalMemory')) is int and actual['gpuTotalMemory']>=28*1024**3,'Insufficient recorded GPU memory')
    packages=actual.get('packages',{})
    require(set(packages)=={'torch','transformers','peft','accelerate','safetensors','tokenizers'},'Package inventory drift')
    require(packages.get('torch')=='2.9.1+rocm7.2.1.lw.gitff65f5bc' and actual.get('torchRuntime')=='2.9.1+rocm7.2.1.gitff65f5bc','Unexpected reviewed Torch runtime')
    require(packages.get('transformers')=='5.15.1' and packages.get('accelerate')=='1.14.0'
            and packages.get('safetensors')=='0.8.0','Reviewed package version drift')
    require(isinstance(actual.get('hip'),str) and actual['hip'].startswith('7.2'),'Unexpected HIP runtime')
    require(packages.get('peft')=='0.21.0' and packages.get('tokenizers')=='0.22.2','Adapter/tokenizer version drift')
    process_env=actual.get('processEnv',{})
    require(set(process_env)=={'HSA_ENABLE_DXG_DETECTION','LD_LIBRARY_PATH','PYTHONPATH','TORCH_BLAS_PREFER_HIPBLASLT'}
            and process_env['HSA_ENABLE_DXG_DETECTION']=='1' and process_env['TORCH_BLAS_PREFER_HIPBLASLT']=='0','Deterministic ROCm environment drift')


def check_qualification(root,contract):
    require(canonical(contract)==CONTRACT_CANONICAL_SHA,'Reviewed qualification contract changed')
    require(digest(evidence(root,'qualification.json'))==QUALIFICATION_SHA
            and contract['qualificationEvidence']['sha256']==QUALIFICATION_SHA,'Original qualification proof changed')
    proof=read(root/'qualification.json')
    require(proof.get('status')=='qualified' and proof.get('deterministicAlgorithms') is True,'GPU runtime was not qualified')
    require(proof.get('pythonExecutable')=='/home/glcarrillo/comfyui-r9700-venv/bin/python','Unreviewed interpreter')
    smokes=proof.get('smokes',[])
    require({smoke.get('kind') for smoke in smokes}=={'linear','qwen3-lora'} and len(smokes)==2,'Missing numerical smoke evidence')
    for smoke in smokes:
        require(all(smoke.get(key) is True for key in ('finiteLosses','finiteGradients','exactRepeatPassed'))
                and smoke.get('changedTensorCount')==smoke.get('trainableTensorCount') and smoke['changedTensorCount']>0,'Numerical smoke failure')
        for loss in smoke['losses']: finite(loss,'qualification loss')
    for name,record in proof['packageInventory'].items():
        require(record.get('metadataHashes') and all(SHA.fullmatch(value) for value in record['metadataHashes'].values()),'Missing qualified package hashes')
        if name in contract['environment']['packages']:
            require(record['version']==contract['environment']['packages'][name],'Package version/proof mismatch')
    runtime_root=Path(__file__).resolve().parents[2]/'artifacts/learning-engine/research/qwen3-runtime'
    for name,hashed in proof['overlayFileHashes'].items():
        require(digest(evidence(runtime_root,name))==hashed,'Qualified adapter package changed')
    require(digest(evidence(runtime_root,'qualify_runtime.py'))==proof['sourceSha256'],'Qualification source changed')


def check_tokenization(items,train,development):
    require(isinstance(items,list) and len(items)==488,'Missing complete tokenization evidence')
    for item in items:
        prefix,full,labels=item.get('prefix'),item.get('full'),item.get('labels')
        require(isinstance(prefix,list) and prefix and isinstance(full,list) and len(full)>len(prefix),'Invalid token sequence')
        require(all(type(token) is int and 0<=token<151936 for token in full+prefix),'Invalid tokenizer ID')
        require(full[:len(prefix)]==prefix and labels==[-100]*len(prefix)+full[len(prefix):],'Target leaked into prefix or loss mask')
        require(type(item.get('targetTokens')) is int and item['targetTokens']==len(full)-len(prefix),'Target token count drift')
        require(len(full)<=512 and len(prefix)+128<=512,'Undeclared sequence truncation')
    require(len(train)==440 and len(development)==48,'Frozen partition count drift')
    return sum(item['targetTokens'] for item in items[:440])*2


def check_history(history,train,encoded):
    require(isinstance(history,list) and len(history)==220,'Missing optimizer steps')
    expected=[]
    for epoch in (1,2):
        indices=list(range(440))
        random.Random(59177+epoch).shuffle(indices)
        expected.extend((epoch,indices[i:i+4]) for i in range(0,440,4))
    seen=tokens=0
    for step,(record,(epoch,indices)) in enumerate(zip(history,expected,strict=True),1):
        require(record.get('optimizerStep')==step and record.get('epoch')==epoch,'Optimizer order drift')
        finite(record.get('gradientNorm'),'gradient norm')
        examples=record.get('examples')
        require(isinstance(examples,list) and len(examples)==4,'Incomplete accumulation batch')
        for example,index in zip(examples,indices,strict=True):
            require(example.get('id')==train[index]['id'],'Training order/data mismatch')
            require(example.get('targetTokens')==encoded[index]['targetTokens'],'Training target accounting mismatch')
            finite(example.get('loss'),'training loss')
            seen+=1
            tokens+=encoded[index]['targetTokens']
        require(record.get('examplesSeen')==seen and record.get('targetTokensSeen')==tokens,'Cumulative training accounting mismatch')
    return tokens


def expected_tensors(default=False):
    dimensions={'q_proj':(4096,2560),'k_proj':(1024,2560),'v_proj':(1024,2560),'o_proj':(2560,4096)}
    result={}
    suffix='.default' if default else ''
    for layer in range(36):
        for module,(out_dim,in_dim) in dimensions.items():
            prefix=f'base_model.model.model.layers.{layer}.self_attn.{module}'
            result[prefix+f'.lora_A{suffix}.weight']=[16,in_dim]
            result[prefix+f'.lora_B{suffix}.weight']=[out_dim,16]
    return result


def check_weights(root,epoch):
    config=read(evidence(root,f'epoch-{epoch}/adapter_config.json'))
    require(config.get('peft_type')=='LORA' and config.get('task_type')=='CAUSAL_LM','Not a causal LoRA')
    require(config.get('r')==16 and config.get('lora_alpha')==32 and config.get('lora_dropout')==0
            and config.get('bias')=='none' and set(config.get('target_modules',[]))==set(SETTINGS['targetModules']),'LoRA configuration drift')
    require(not config.get('modules_to_save') and not config.get('rank_pattern') and not config.get('alpha_pattern')
            and not config.get('use_dora') and not config.get('use_rslora'),'Undeclared adapter behavior')
    path=evidence(root,f'epoch-{epoch}/adapter_model.safetensors')
    with path.open('rb') as stream:
        size_bytes=stream.read(8)
        require(len(size_bytes)==8,'Truncated weight prefix')
        length=struct.unpack('<Q',size_bytes)[0]
        require(2<=length<=16*1024*1024,'Invalid safetensors header length')
        header=parse(stream.read(length).decode('utf-8'))
    tensors={name:value for name,value in header.items() if name!='__metadata__'}
    expected=expected_tensors()
    require(set(tensors)==set(expected),'Missing layer/module or unexpected adapter tensor')
    payload=path.stat().st_size-8-length
    spans=[]
    sizes={'F32':4,'BF16':2,'F16':2}
    for name,shape in expected.items():
        tensor=tensors[name]
        require(tensor.get('shape')==shape and tensor.get('dtype') in sizes,'Adapter dimensions/dtype mismatch')
        span=tensor.get('data_offsets')
        require(isinstance(span,list) and len(span)==2 and all(type(n) is int for n in span),'Invalid weight offsets')
        start,end=span
        require(0<=start<end<=payload and end-start==math.prod(shape)*sizes[tensor['dtype']],'Truncated adapter tensor')
        spans.append((start,end))
    spans.sort()
    require(spans[0][0]==0 and spans[-1][1]==payload and all(a[1]==b[0] for a,b in zip(spans,spans[1:])),'Unaccounted or overlapping weight bytes')


def base_tensor_shapes(config):
    """Unique stored parameters for bias-free Qwen3 with tied input/output weights."""
    require(config.get('model_type')=='qwen3' and config.get('tie_word_embeddings') is True
            and config.get('attention_bias') is False,'Unexpected base architecture/tied-weight contract')
    keys=('hidden_size','intermediate_size','num_attention_heads','num_key_value_heads',
          'head_dim','vocab_size','num_hidden_layers')
    require(all(type(config.get(key)) is int and config[key]>0 for key in keys),'Invalid architecture dimensions')
    hidden,intermediate,heads,kv,head,vocab,layers=(config[key] for key in keys)
    result={'model.embed_tokens.weight':[vocab,hidden],'model.norm.weight':[hidden]}
    for layer in range(layers):
        prefix=f'model.layers.{layer}.'
        for name,shape in {
            'self_attn.q_proj.weight':[heads*head,hidden],
            'self_attn.k_proj.weight':[kv*head,hidden],
            'self_attn.v_proj.weight':[kv*head,hidden],
            'self_attn.o_proj.weight':[hidden,heads*head],
            'self_attn.q_norm.weight':[head],'self_attn.k_norm.weight':[head],
            'mlp.gate_proj.weight':[intermediate,hidden],
            'mlp.up_proj.weight':[intermediate,hidden],
            'mlp.down_proj.weight':[hidden,intermediate],
            'input_layernorm.weight':[hidden],'post_attention_layernorm.weight':[hidden],
        }.items(): result[prefix+name]=shape
    return result


def check_base_headers(config,index,shards):
    """Count actual verified tensor spans; index metadata.total_size is not a count."""
    expected=base_tensor_shapes(config)
    weight_map=index.get('weight_map',{})
    require(set(weight_map)==set(expected) and set(weight_map.values())==set(shards),'Base index tensor inventory drift')
    observed={}
    for shard,(header,payload) in shards.items():
        tensors={name:value for name,value in header.items() if name!='__metadata__'}
        require(set(tensors)=={name for name,location in weight_map.items() if location==shard},'Base shard/index mismatch')
        spans=[]
        for name,tensor in tensors.items():
            require(name not in observed and tensor.get('shape')==expected[name]
                    and tensor.get('dtype')=='BF16','Base tensor shape/dtype drift')
            span=tensor.get('data_offsets')
            require(isinstance(span,list) and len(span)==2 and all(type(n) is int for n in span),'Invalid base tensor offsets')
            start,end=span
            elements=math.prod(expected[name])
            require(0<=start<end<=payload and end-start==elements*2,'Base tensor byte count drift')
            spans.append((start,end))
            observed[name]=elements
        spans.sort()
        require(spans and spans[0][0]==0 and spans[-1][1]==payload
                and all(a[1]==b[0] for a,b in zip(spans,spans[1:])),'Unaccounted or overlapping base tensor bytes')
    require(set(observed)==set(expected),'Incomplete base parameter inventory')
    return sum(observed.values())


def base_parameter_count(snapshot):
    config=read(evidence(snapshot,'config.json'))
    index=read(evidence(snapshot,'model.safetensors.index.json'))
    shards={}
    for name in set(index['weight_map'].values()):
        path=evidence(snapshot,name)
        with path.open('rb') as stream:
            prefix=stream.read(8)
            require(len(prefix)==8,'Truncated base weight prefix')
            length=struct.unpack('<Q',prefix)[0]
            require(2<=length<=16*1024*1024,'Invalid base safetensors header')
            header=parse(stream.read(length).decode('utf-8'))
        shards[name]=(header,path.stat().st_size-8-length)
    return check_base_headers(config,index,shards)


def check_parameters(parameters,base_elements):
    expected=expected_tensors(default=True)
    names=parameters.get('names',{})
    require(set(names)==set(expected),'Unexpected trainable base parameter or missing adapter')
    for name,shape in expected.items():
        require(names[name].get('elements')==math.prod(shape) and names[name].get('dtype') in ('torch.float32','torch.bfloat16'),'Trainable tensor shape/dtype mismatch')
    trainable=sum(math.prod(shape) for shape in expected.values())
    require(parameters.get('trainable')==trainable and parameters.get('total')==base_elements+trainable,'Trainable/base parameter accounting drift')


def check_generated_records(records,rows,encoded,tokenizer,scorer,aggregator):
    require(len(records)==len(rows)==len(encoded)==48,'Incomplete development evaluation')
    for row,item,record in zip(rows,encoded,records,strict=True):
        require(record.get('id')==row['id'] and record.get('targetTokens')==item['targetTokens'],'Evaluation target accounting drift')
        finite(record.get('targetTokenLoss'),'target loss')
        token_values=record.get('generatedTokenIds')
        require(isinstance(token_values,list) and 0<len(token_values)<=128
                and all(type(token) is int and 0<=token<151936 for token in token_values),'Invalid generated token IDs')
        require(tokenizer.decode(token_values,skip_special_tokens=True)==record.get('output'),'Raw output differs from decoded generated tokens')
        require(record.get('diagnostics')==scorer(record['output'],row),'Rehashed diagnostic fabrication')
    return aggregator(records,rows)


def verify(root):
    from train_qwen3_4b_research import score,aggregate,validated_data,token_ids
    from prepare_qwen3_4b_research import DEFAULT_OUTPUT,validate_snapshot
    from transformers import AutoTokenizer
    root=Path(root).resolve()
    report=read(evidence(root,'report.json'))
    require(report.get('schema')=='diana-qwen3-grounding-development-v1' and report.get('status') in ('completed','rejected-development'),'Incomplete or wrong experiment')
    for key,value in (('productionEligible',False),('researchOnly',True),('testOpened',False),('testEvaluations',0),('providerCalls',0),('educatorReviewed',False)):
        require(report.get(key)==value,'Research boundary drift: '+key)
    files={p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
    require(not any('test' in name.lower() or 'interrupted' in name.lower() for name in files),'Final-test or interrupted-run evidence is not allowed')
    worker_files=files-{'report.json','completion.json','execution.log','supervisor-artifact-manifest.json'}
    manifest(root,report.get('artifactHashes'),worker_files)
    protocol=read(evidence(root,'protocol.json'))
    require(digest(root/'protocol.json')==report.get('protocolSha256'),'Protocol digest mismatch')
    require(protocol.get('schema')=='diana-qwen3-grounding-protocol-v1' and protocol.get('model')==MODEL
            and protocol.get('revision')==REVISION and protocol.get('settings')==SETTINGS,'Fixed model or recipe drift')
    require(protocol.get('dataCanonicalHashes')==DATA_HASHES and protocol.get('systemSha256')==SYSTEM_HASH,'Data/prompt contract drift')
    require(protocol.get('initialAdapter') is None and protocol.get('freshOptimizer') is True and protocol.get('inferencePerformed') is False,'Fresh base/optimizer boundary drift')
    for key,value in (('productionEligible',False),('researchOnly',True),('testOpened',False),('testEvaluations',0),('educatorReviewed',False),('studentOrTextbookDataUsed',False)):
        require(protocol.get(key)==value,'Protocol research boundary drift')
    expected_frozen={'train.json','development.json','environment-contract.json','qualification.json','model-provenance.json','tokenization.json'}|{'source/'+name for name in SOURCES}
    manifest(root,protocol.get('frozenFiles'),expected_frozen)
    for name in SOURCES:
        require(digest(Path(__file__).with_name(name))==digest(root/'source'/name),'Frozen source drift: '+name)
    environment=protocol.get('environment',{})
    environment_contract=read(root/'environment-contract.json')
    check_environment(environment,environment_contract)
    check_qualification(root,environment_contract)
    require(canonical(environment)==protocol.get('environmentSha256'),'Environment digest mismatch')
    require(digest(root/'model-provenance.json')==PROVENANCE_SHA,'Publisher provenance drift')
    snapshot=validate_snapshot(DEFAULT_OUTPUT)
    require(digest(DEFAULT_OUTPUT/'model-provenance.json')==PROVENANCE_SHA,'Local approved model provenance mismatch')
    train,development=read(root/'train.json'),read(root/'development.json')
    require(canonical(train)==DATA_HASHES['train'] and canonical(development)==DATA_HASHES['development'],'Rehashed dataset change')
    require((train,development)==tuple(validated_data()),'Dataset differs from frozen original records')
    encoded=read(root/'tokenization.json')
    expected_targets=check_tokenization(encoded,train,development)
    require(canonical(encoded)==protocol.get('tokenizationSha256'),'Tokenization digest mismatch')
    tokenizer=AutoTokenizer.from_pretrained(snapshot,local_files_only=True,trust_remote_code=False)
    require(encoded==[token_ids(tokenizer,row) for row in train+development],'Recomputed tokenizer/masking evidence mismatch')
    require(protocol.get('minimumTargetTokens')==min(row['targetTokens'] for row in encoded)
            and protocol.get('maximumFullTokens')==max(len(row['full']) for row in encoded),'Tokenization bounds drift')
    def evaluation(label):
        records=read_lines(evidence(root,label+'.jsonl'))
        metrics=check_generated_records(records,development,encoded[440:],tokenizer,score,aggregate)
        require(metrics==read(evidence(root,label+'-metrics.json')),'Aggregate metric drift')
        return records,metrics
    _,baseline=evaluation('baseline-development')
    require(report.get('baseline')==baseline,'Reported baseline mismatch')
    parameters=read(evidence(root,'parameters.json'))
    check_parameters(parameters,base_parameter_count(snapshot))
    require(report.get('trainableParameters')==parameters['trainable'],'Reported trainable parameter mismatch')
    candidates=[]
    outputs={}
    for epoch in (1,2):
        records,metrics=evaluation(f'epoch-{epoch}-development')
        outputs[epoch]=records
        candidate=read(evidence(root,f'epoch-{epoch}-candidate.json'))
        require(candidate.get('epoch')==epoch and candidate.get('metrics')==metrics
                and candidate.get('gates')==required_gates(baseline,metrics) and candidate.get('optimizerSteps')==epoch*110,'Candidate gate/accounting drift')
        expected_checkpoint={p.name for p in (root/f'epoch-{epoch}').iterdir() if p.is_file()}
        require(expected_checkpoint=={'README.md','adapter_config.json','adapter_model.safetensors'},'Unexpected checkpoint inventory')
        manifest(root/f'epoch-{epoch}',candidate.get('artifactHashes'),expected_checkpoint)
        check_weights(root,epoch)
        candidates.append(candidate)
    tokens=check_history(read_lines(evidence(root,'training-history.jsonl')),train,encoded)
    require(tokens==expected_targets==report.get('targetTokensSeen'),'Total target-token accounting mismatch')
    require(report.get('optimizerSteps')==220==protocol.get('expectedOptimizerSteps') and report.get('examplesSeen')==880
            and report.get('trainCount')==440==protocol.get('trainCount') and report.get('developmentCount')==48==protocol.get('developmentCount'),'Training count mismatch')
    eligible=[candidate for candidate in candidates if all(candidate['gates'].values())]
    selected=min(eligible,key=lambda candidate:(candidate['metrics']['targetTokenLoss'],candidate['epoch'])) if eligible else None
    selection=read(evidence(root,'selection.json'))
    epoch=selected['epoch'] if selected else None
    require(selection.get('candidates')==candidates and selection.get('selectedEpoch')==epoch==report.get('selectedEpoch')
            and selection.get('validationPassed') is bool(selected),'Validation selection drift')
    require(selection.get('productionEligible') is False and selection.get('testOpened') is False and selection.get('testEvaluations')==0,'Selection final-test claim')
    if selected:
        records,metrics=evaluation('selected-reload-development')
        require(all(a['output']==b['output'] and a['generatedTokenIds']==b['generatedTokenIds'] and a['id']==b['id']
                    for a,b in zip(outputs[epoch],records,strict=True)) and all(required_gates(baseline,metrics).values()),'Saved adapter reload mismatch')
        require(selection.get('savedAdapterOutputsIdentical') is True and report['status']=='completed','Missing verified eligible reload')
    else:
        require(selection.get('savedAdapterOutputsIdentical') is False and report['status']=='rejected-development'
                and not any('selected-reload' in name for name in files),'Rejected run cannot claim selected/reloaded adapter')
    finite(report.get('elapsedSeconds'),'elapsed runtime')
    require(0<report['elapsedSeconds']<=7200,'Runtime exceeded declared budget')
    completion=read(evidence(root,'completion.json'))
    require(completion.get('reportSha256')==digest(root/'report.json') and completion.get('productionEligible') is False,'Completion receipt mismatch')
    started=read(evidence(root,'started.json'))
    require(started.get('protocolSha256')==report['protocolSha256'],'Execution protocol changed')
    supervisor=read(evidence(root,'supervisor-artifact-manifest.json'))
    require(supervisor.get('productionEligible') is False,'Supervisor production claim')
    manifest(root,supervisor.get('files'),files-{'supervisor-artifact-manifest.json'})
    return {'verified':True,'reportSha256':digest(root/'report.json'),'selectedEpoch':epoch,'validationPassed':bool(selected),
            'baseline':baseline,'candidates':candidates,'testOpened':False,'productionEligible':False,'finalQualityValidated':False}


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--run',type=Path,required=True)
    print(json.dumps(verify(parser.parse_args().run),indent=2))
