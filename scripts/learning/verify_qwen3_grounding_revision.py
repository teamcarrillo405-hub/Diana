"""Read-only revision evidence verification. No inference or final-case loading."""
from __future__ import annotations
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path, PurePosixPath, PureWindowsPath
import random

import verify_qwen3_4b_research as prior
from verify_qwen3_4b_research import require, read, read_lines, digest, canonical, evidence, manifest, finite

SYSTEM_HASH='55ae2f410463500e0ff54b9c4ffb479f219bf3b2efb101daa8dfcebf61e223d7'
PARENT_REPORT='cfa06bdc14f8c9041a364f0612cae13eade9c462e231492197bf66e886e25943'
PARENT_PROTOCOL='2ff6ce808c9e8bcf1d133831e37e20d90c6d5dff5535bd6ef014fbf160f9d6f8'
SETTINGS={**prior.SETTINGS,'learningRate':.00002,'seed':69177,'maxSequence':768,
          'formalEligibilityThreshold':.95,'semanticAcceptanceTarget':.95}
del SETTINGS['groundedAccuracyThreshold']
DATA_MODULES={'qwen3_grounding_revision_a.py','qwen3_grounding_revision_b.py'}
SOURCES=prior.SOURCES|{'train_qwen3_grounding_revision.py','verify_qwen3_4b_research.py'}|DATA_MODULES
PARENT_FILES={'report.json','protocol.json','selection.json','completion.json','supervisor-artifact-manifest.json',
              'model-provenance.json','epoch-1/adapter_model.safetensors','epoch-1/adapter_config.json','epoch-1-development.jsonl'}


def boundaries(record,validation=False):
    flags={'productionEligible':False,'testOpened':False,'testEvaluations':0,'semanticQualityValidated':False}
    if validation: flags['validationPassed']=False
    for key,value in flags.items():
        require(type(record.get(key)) is type(value) and record[key]==value,'False research/semantic boundary: '+key)


def required_gates(base,candidate):
    require(base['cases']==candidate['cases']==48,'Formal gate population drift')
    for value in (base['targetTokenLoss'],candidate['targetTokenLoss']): finite(value,'formal gate loss')
    counts=candidate['formalCounts']
    require(set(counts)=={'correctAnswerability','exactQuoteOrWarrantedAbstention','twoLinesAndOneQuestion','unsupportedAnswer'},'Formal count inventory drift')
    require(all(type(value) is int and 0<=value<=48 for value in counts.values()),'Invalid formal counts')
    return {'answerabilityAtLeast95Percent':counts['correctAnswerability']*100>=95*48,
            'exactQuoteOrWarrantedAbstentionAtLeast95Percent':counts['exactQuoteOrWarrantedAbstention']*100>=95*48,
            'formatAtLeast95Percent':counts['twoLinesAndOneQuestion']*100>=95*48,
            'zeroUnsupportedAnswers':counts['unsupportedAnswer']==0,
            'lossNonRegressionAgainstUntouchedBase':candidate['targetTokenLoss']<=base['targetTokenLoss']}


def aggregate(records,rows):
    from train_qwen3_4b_research import aggregate as old_aggregate,score
    result=old_aggregate(records,rows)
    diagnostics=[score(record['output'],row) for record,row in zip(records,rows,strict=True)]
    result['formalCounts']={
        'correctAnswerability':sum(int(d['expectedAbstentionMatched']) for d in diagnostics),
        'exactQuoteOrWarrantedAbstention':sum(int(d['exactSourceQuoteOrAbstention'] and d['expectedAbstentionMatched']) for d in diagnostics),
        'twoLinesAndOneQuestion':sum(int(d['twoLineFormat'] and d['oneQuestion']) for d in diagnostics),
        'unsupportedAnswer':sum(int(d['unsupportedAnswer']) for d in diagnostics)}
    result['formalRates']={key:value/len(rows) for key,value in result['formalCounts'].items()}
    result['slices']={}
    for label,expected in (('supported',False),('insufficient',True)):
        indices=[i for i,row in enumerate(rows) if row['expectedAbstention'] is expected]
        require(indices,'Both formal answerability slices required')
        result['slices'][label]=old_aggregate([records[i] for i in indices],[rows[i] for i in indices])
    return result


def check_training(rows,development):
    from train_qwen3_4b_research import score
    require(len(rows)==600 and len({row['id'] for row in rows})==600,'Require 600 unique training IDs')
    require(not {row['id'] for row in rows}&{row['id'] for row in development},'Training/development ID overlap')
    require(not {row['source'] for row in rows}&{row['source'] for row in development},'Training/development source overlap')
    require(len({(row['source'],row['question']) for row in rows})==600,'Duplicate training question')
    subjects=Counter(row['subject'] for row in rows)
    require(len(subjects)==5 and set(subjects.values())=={120},'Subject coverage imbalance')
    contexts=Counter(row['source'] for row in rows)
    require(len(contexts)==200 and set(contexts.values())=={3},'Require 200 three-question contexts')
    for subject in subjects:
        require(Counter(row['expectedAbstention'] for row in rows if row['subject']==subject)=={True:60,False:60},'Subject answerability imbalance')
    for partition in (rows[:300],rows[300:]):
        counts=Counter(row['source'] for row in partition)
        require(len(counts)==100 and set(counts.values())=={3}
                and Counter(row['expectedAbstention'] for row in partition)=={True:150,False:150},'Independent partition imbalance')
    for row in rows:
        require(type(row['expectedAbstention']) is bool and all(isinstance(row[key],str) and row[key].strip() for key in ('id','source','question','target')),'Invalid training record')
        require(score(row['target'],row)['groundedCasePass'],'Training target violates diagnostic contract')


def check_audit(root,audit,train):
    require(audit.get('schema')=='diana-qwen3-training-revision-audit-v1'
            and audit.get('approvedForTraining') is True and audit.get('independentReviewer') is True,'Independent training audit missing')
    require(audit.get('educatorReviewed') is False and audit.get('unresolvedFindings')==[],'Unsupported educator approval or unresolved audit')
    require(audit.get('trainingCanonicalSha256')==canonical(train),'Training audit data hash mismatch')
    reviews=audit.get('caseReviews',[])
    require(len(reviews)==600 and len({row['id'] for row in reviews})==600
            and {row['id'] for row in reviews}=={row['id'] for row in train}
            and all(row.get('passed') is True for row in reviews),'Incomplete full training audit coverage')
    require(audit.get('sourceSha256')=={name:digest(evidence(root,'source/'+name)) for name in DATA_MODULES},'Audited source hash drift')
    copied=read(evidence(root,'audit-evidence-manifest.json'))
    originals=audit.get('evidenceFiles',{})
    require(isinstance(originals,dict) and originals and len(copied)==len(originals),'Missing audit evidence')
    expected={f'audit-evidence/{i}-{PurePosixPath(name.replace(chr(92),chr(47))).name}':{'originalPath':name,'sha256':value}
              for i,(name,value) in enumerate(sorted(originals.items()))}
    require(copied==expected,'Audit evidence mapping changed')
    for name,item in copied.items(): require(digest(evidence(root,name))==item['sha256'],'Audit evidence bytes changed')
    return set(copied)


def check_tokenization(encoded,train,development):
    require(len(encoded)==648 and len(train)==600 and len(development)==48,'Revision tokenization population drift')
    for item in encoded:
        prefix,full,labels=item.get('prefix'),item.get('full'),item.get('labels')
        require(isinstance(prefix,list) and prefix and isinstance(full,list) and len(full)>len(prefix),'Invalid revision sequence')
        require(all(type(token) is int and 0<=token<151936 for token in full+prefix),'Invalid revision token ID')
        require(full[:len(prefix)]==prefix and labels==[-100]*len(prefix)+full[len(prefix):],'Source loss or target leakage')
        require(type(item.get('targetTokens')) is int and item['targetTokens']==len(full)-len(prefix),'Target token accounting drift')
        require(len(full)<=768 and len(prefix)+128<=768,'Undeclared revision truncation')
    return sum(row['targetTokens'] for row in encoded[:600])*2


def check_history(history,train,encoded):
    require(len(history)==300,'Missing revision optimizer steps')
    expected=[]
    for epoch in (1,2):
        order=list(range(600))
        random.Random(69177+epoch).shuffle(order)
        expected.extend((epoch,order[i:i+4]) for i in range(0,600,4))
    seen=tokens=0
    for step,(record,(epoch,indices)) in enumerate(zip(history,expected,strict=True),1):
        require(record.get('optimizerStep')==step and record.get('epoch')==epoch,'Revision optimizer order changed')
        finite(record.get('gradientNorm'),'gradient norm')
        examples=record.get('examples',[])
        require(len(examples)==4,'Incomplete revision accumulation')
        for example,index in zip(examples,indices,strict=True):
            require(example.get('id')==train[index]['id'] and example.get('targetTokens')==encoded[index]['targetTokens'],'Revision example/token mismatch')
            finite(example.get('loss'),'training loss')
            seen+=1
            tokens+=encoded[index]['targetTokens']
        require(record.get('examplesSeen')==seen and record.get('targetTokensSeen')==tokens,'Cumulative revision accounting mismatch')
    return tokens


def identical(original,reproduced):
    require(len(original)==len(reproduced)==48,'Incomplete reproduction')
    require(all(all(a.get(key)==b.get(key) for key in ('id','output','generatedTokenIds','targetTokens'))
                for a,b in zip(original,reproduced,strict=True)),'Reproduction output/token identity mismatch')


def parent_path_identity(value):
    """Recognize both recorded host syntaxes independently of the verifier OS."""
    require(isinstance(value,str) and value and '\x00' not in value,'Invalid recorded parent path')
    normalized=value.replace('\\','/')
    require(not normalized.startswith('//') and not any(part in ('.','..') for part in normalized.split('/')),
            'Relative/traversing recorded parent path')
    require(str(PurePosixPath(normalized))==normalized,'Noncanonical recorded parent path')
    windows=PureWindowsPath(normalized)
    if windows.is_absolute() and len(windows.drive)==2 and windows.drive[1]==':':
        return ('windows',normalized.casefold())
    posix=PurePosixPath(normalized)
    require(posix.is_absolute() and ':' not in normalized,'Invalid recorded parent path')
    parts=posix.parts
    if len(parts)>=4 and parts[1]=='mnt' and len(parts[2])==1 and parts[2].isalpha():
        return ('windows',(parts[2]+':/'+ '/'.join(parts[3:])).casefold())
    return ('posix',normalized)


def check_parent_path(recorded,local_parent):
    require(parent_path_identity(recorded)==parent_path_identity(str(local_parent)),
            'Recorded parent is not the mapped local sibling')
    require(PurePosixPath(recorded.replace('\\','/')).name=='qwen3-run-006','Unexpected recorded parent run')


def verify(root):
    from train_qwen3_grounding_revision import token_ids,validated_data,ORIGINAL_SYSTEM
    from train_qwen3_4b_research import score
    from prepare_qwen3_4b_research import validate_snapshot,DEFAULT_OUTPUT
    from transformers import AutoTokenizer
    root=Path(root).resolve()
    report=read(evidence(root,'report.json'))
    require(report.get('schema')=='diana-qwen3-grounding-revision-development-v1','Wrong revision schema')
    boundaries(report,validation=True)
    require(report.get('researchOnly') is True and report.get('educatorReviewed') is False and report.get('providerCalls')==0,'Unsupported revision execution claim')
    files={path.relative_to(root).as_posix() for path in root.rglob('*') if path.is_file()}
    require(not any('test' in name.lower() or 'interrupted' in name.lower() for name in files),'Final-test or interrupted artifact prohibited')
    manifest(root,report.get('artifactHashes'),files-{'report.json','completion.json','execution.log','supervisor-artifact-manifest.json'})
    protocol=read(evidence(root,'protocol.json'))
    require(digest(root/'protocol.json')==report.get('protocolSha256'),'Revision protocol hash mismatch')
    require(protocol.get('schema')=='diana-qwen3-grounding-revision-protocol-v1' and protocol.get('model')==prior.MODEL
            and protocol.get('revision')==prior.REVISION and protocol.get('settings')==SETTINGS,'Revision recipe drift')
    boundaries(protocol)
    require(protocol.get('freshOptimizer') is True and protocol.get('inferencePerformed') is False
            and protocol.get('researchOnly') is True and protocol.get('educatorReviewed') is False
            and protocol.get('studentOrTextbookDataUsed') is False,'Revision frozen research boundary drift')
    require(protocol.get('systemSha256')==SYSTEM_HASH==hashlib.sha256(protocol['system'].encode()).hexdigest()
            and protocol.get('originalSystemSha256')==prior.SYSTEM_HASH,'Revision prompt drift')
    train,development=read(evidence(root,'train.json')),read(evidence(root,'development.json'))
    check_training(train,development)
    require(canonical(development)==prior.DATA_HASHES['development'],'Original development annotations changed')
    require(protocol.get('dataCanonicalHashes')=={'train':canonical(train),'development':canonical(development)},'Revision data hash mismatch')
    require((train,development)==tuple(validated_data()),'Revision source/row mismatch')
    audit_files=check_audit(root,read(evidence(root,'training-audit.json')),train)
    frozen={'train.json','development.json','environment-contract.json','qualification.json','model-provenance.json',
            'tokenization.json','parent-original-tokenization.json','parent-evidence.json','training-audit.json',
            'audit-evidence-manifest.json','design.md'}|audit_files|{'source/'+name for name in SOURCES}
    manifest(root,protocol.get('frozenFiles'),frozen)
    for name in SOURCES: require(digest(Path(__file__).with_name(name))==digest(root/'source'/name),'Frozen revision source drift: '+name)
    contract=read(root/'environment-contract.json')
    prior.check_environment(protocol['environment'],contract)
    prior.check_qualification(root,contract)
    require(canonical(protocol['environment'])==protocol.get('environmentSha256'),'Revision environment hash drift')
    require(digest(root/'model-provenance.json')==prior.PROVENANCE_SHA,'Revision publisher provenance drift')
    snapshot=validate_snapshot(DEFAULT_OUTPUT)
    require(digest(DEFAULT_OUTPUT/'model-provenance.json')==prior.PROVENANCE_SHA,'Revision local model provenance mismatch')
    parent=protocol.get('parent',{})
    require(parent==read(root/'parent-evidence.json') and parent.get('epoch')==1,'Parent identity mismatch')
    parent_root=root.parent/'qwen3-run-006'
    check_parent_path(parent.get('root',''),parent_root)
    require(protocol.get('initialAdapter')=={'epoch':1,'root':parent['root']},'Parent adapter choice drift')
    manifest(parent_root,parent.get('files'),PARENT_FILES)
    require(digest(parent_root/'report.json')==PARENT_REPORT and digest(parent_root/'protocol.json')==PARENT_PROTOCOL,'Wrong immutable parent')
    parent_verified=prior.verify(parent_root)
    require(parent.get('verified')==parent_verified and parent_verified['selectedEpoch'] is None
            and parent_verified['candidates'][0]['metrics']['counts']['groundedCasePass']>parent_verified['candidates'][1]['metrics']['counts']['groundedCasePass'],'Parent research selection rule violated')
    encoded=read(root/'tokenization.json')
    targets=check_tokenization(encoded,train,development)
    require(canonical(encoded)==protocol.get('tokenizationSha256'),'Revision encoded hash mismatch')
    tokenizer=AutoTokenizer.from_pretrained(snapshot,local_files_only=True,trust_remote_code=False)
    require(encoded==[token_ids(tokenizer,row) for row in train+development],'Revision reconstructed tokenization differs')
    require(protocol.get('minimumTargetTokens')==min(row['targetTokens'] for row in encoded)
            and protocol.get('maximumFullTokens')==max(len(row['full']) for row in encoded),'Revision token bounds mismatch')
    original_encoded=read(root/'parent-original-tokenization.json')
    require(original_encoded==[token_ids(tokenizer,row,ORIGINAL_SYSTEM) for row in development]
            and canonical(original_encoded)==protocol.get('parentOriginalTokenizationSha256'),'Original parent tokenization mismatch')
    def evaluation(label,items=None):
        records=read_lines(evidence(root,label+'.jsonl'))
        metrics=prior.check_generated_records(records,development,encoded[600:] if items is None else items,tokenizer,score,aggregate)
        require(metrics==read(evidence(root,label+'-metrics.json')),'Revision aggregate drift')
        return records,metrics
    reproduced,original_metrics=evaluation('parent-original-reproduction',original_encoded)
    identical(read_lines(parent_root/'epoch-1-development.jsonl'),reproduced)
    require(read(evidence(root,'parent-reproduction.json'))=={'identicalOutputs':True,'cases':48,'parentEpoch':1},'Missing parent reproduction receipt')
    _,baseline=evaluation('baseline-development')
    _,parent_metrics=evaluation('parent-development')
    require(report.get('baseline')==baseline and report.get('parent')==parent_metrics and report.get('parentOriginal')==original_metrics,'Paired base/parent report mismatch')
    parameters=read(evidence(root,'parameters.json'))
    prior.check_parameters(parameters,prior.base_parameter_count(snapshot))
    require(report.get('trainableParameters')==parameters['trainable'],'Revision trainable report mismatch')
    candidates=[]
    outputs={}
    for epoch in (1,2):
        records,metrics=evaluation(f'epoch-{epoch}-development')
        outputs[epoch]=records
        candidate=read(evidence(root,f'epoch-{epoch}-candidate.json'))
        require(candidate.get('epoch')==epoch and candidate.get('optimizerSteps')==epoch*150
                and candidate.get('metrics')==metrics and candidate.get('gates')==required_gates(baseline,metrics),'Revision candidate metric/gate drift')
        checkpoint=root/f'epoch-{epoch}'
        inventory={path.name for path in checkpoint.iterdir() if path.is_file()}
        require(inventory=={'README.md','adapter_config.json','adapter_model.safetensors'},'Revision checkpoint inventory drift')
        manifest(checkpoint,candidate.get('artifactHashes'),inventory)
        prior.check_weights(root,epoch)
        candidates.append(candidate)
    tokens=check_history(read_lines(evidence(root,'training-history.jsonl')),train,encoded)
    require(tokens==targets==report.get('targetTokensSeen'),'Revision target-token total mismatch')
    require(report.get('optimizerSteps')==300==protocol.get('expectedOptimizerSteps') and report.get('examplesSeen')==1200
            and report.get('trainCount')==600==protocol.get('trainCount') and report.get('developmentCount')==48==protocol.get('developmentCount'),'Revision accounting mismatch')
    eligible=[candidate for candidate in candidates if all(candidate['gates'].values())]
    selected=min(eligible,key=lambda item:(item['metrics']['targetTokenLoss'],item['epoch'])) if eligible else None
    epoch=selected['epoch'] if selected else None
    selection=read(evidence(root,'selection.json'))
    boundaries(selection,validation=True)
    require(selection.get('selectedEpoch')==epoch==report.get('selectedEpoch') and selection.get('candidates')==candidates
            and selection.get('automaticEligibilityPassed') is bool(selected) and report.get('automaticEligibilityPassed') is bool(selected),'Formal checkpoint selection drift')
    if selected:
        records,metrics=evaluation('selected-reload-development')
        identical(outputs[epoch],records)
        require(all(required_gates(baseline,metrics).values()) and selection.get('savedAdapterOutputsIdentical') is True
                and report.get('status')=='awaiting-semantic-review','Eligible adapter reload missing or changed')
    else:
        require(selection.get('savedAdapterOutputsIdentical') is False and report.get('status')=='rejected-automatic-eligibility'
                and not any('selected-reload' in name for name in files),'Rejected revision claimed reload')
    finite(report.get('elapsedSeconds'),'revision elapsed time')
    require(0<report['elapsedSeconds']<=7200,'Revision exceeded fixed runtime')
    completion=read(evidence(root,'completion.json'))
    require(completion.get('reportSha256')==digest(root/'report.json') and completion.get('productionEligible') is False,'Revision completion mismatch')
    require(read(evidence(root,'started.json')).get('protocolSha256')==report['protocolSha256'],'Revision execution protocol changed')
    supervisor=read(evidence(root,'supervisor-artifact-manifest.json'))
    require(supervisor.get('productionEligible') is False,'Revision supervisor production claim')
    manifest(root,supervisor.get('files'),files-{'supervisor-artifact-manifest.json'})
    return {'verified':True,'reportSha256':digest(root/'report.json'),'selectedEpoch':epoch,
            'automaticEligibilityPassed':bool(selected),'validationPassed':False,'semanticQualityValidated':False,
            'baseline':baseline,'parent':parent_metrics,'candidates':candidates,'testOpened':False,
            'productionEligible':False,'finalQualityValidated':False}


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--run',type=Path,required=True)
    print(json.dumps(verify(parser.parse_args().run),indent=2))
