"""Strict prospective diagnostics; original experiment scorers stay unchanged.

An explanatory refusal is not a supported answer merely because it differs
from the exact sentinel. Unknown or malformed evidence cannot satisfy syntax.
These rules never substitute for independent semantic review of either line.
"""
import math
import re
from train_qwen3_4b_research import score as legacy_score
from qwen3_evidence_integrity_contract import METRICS_VERSION


def score(text, row):
    previous = legacy_score(text, row)
    result = dict(previous)
    lines = text.strip().splitlines()
    body = lines[0][10:].strip() if lines and lines[0].startswith('EVIDENCE: ') else ''
    quote = body.strip('"')
    canonical_abstention = body == 'insufficient'
    exact_quote = bool(quote) and quote != 'insufficient' and quote in row['source'] and len(quote) <= 240
    # A genuine quotation beginning with the word insufficient is still evidence.
    attempted_abstention = canonical_abstention or (not exact_quote and bool(re.match(r'insufficient\b', quote, re.I)))
    recognized = exact_quote or attempted_abstention
    result.update({
        'legacyExpectedAbstentionMatched': previous['expectedAbstentionMatched'],
        'legacyAbstained': previous['abstained'],
        'legacyUnsupportedAnswer': previous['unsupportedAnswer'],
        'legacyGroundedCasePass': previous['groundedCasePass'],
        'evidenceGrammarValid': exact_quote or canonical_abstention,
        'recognizedAnswerability': recognized,
        'malformedAbstention': attempted_abstention and not canonical_abstention,
        'abstained': attempted_abstention,
        'falseAbstention': attempted_abstention and not row['expectedAbstention'],
        'unsupportedAnswer': row['expectedAbstention'] and not attempted_abstention,
        'expectedAbstentionMatched': recognized and attempted_abstention == row['expectedAbstention'],
    })
    result['groundedCasePass'] = all(result[key] for key in (
        'twoLineFormat', 'oneQuestion', 'evidenceGrammarValid', 'exactSourceQuoteOrAbstention',
        'relevantSourceQuoteOrAbstention', 'expectedAbstentionMatched',
        'caseSpecificNextStep', 'requiredConceptsPresent'))
    return result


def _aggregate(records, rows):
    if not rows or len(records) != len(rows) or len({row['id'] for row in rows}) != len(rows):
        raise ValueError('Incomplete or repeated evaluation identity')
    diagnostics = []
    for record, row in zip(records, rows, strict=True):
        if record.get('id') != row['id'] or not isinstance(record.get('output'), str):
            raise ValueError('Evaluation identity mismatch')
        loss, tokens = record.get('targetTokenLoss'), record.get('targetTokens')
        if type(loss) not in (int, float) or not math.isfinite(loss) or loss < 0:
            raise ValueError('Invalid target loss')
        if type(tokens) is not int or tokens <= 0:
            raise ValueError('Invalid target token count')
        actual = score(record['output'], row)
        if record.get('diagnostics') != actual:
            raise ValueError('Saved diagnostics differ from response')
        diagnostics.append(actual)
    tokens = sum(record['targetTokens'] for record in records)
    formal = {
        'correctAnswerability': sum(d['expectedAbstentionMatched'] for d in diagnostics),
        'exactQuoteOrWarrantedAbstention': sum(d['relevantSourceQuoteOrAbstention'] and d['evidenceGrammarValid'] for d in diagnostics),
        'twoLinesAndOneQuestion': sum(d['twoLineFormat'] and d['oneQuestion'] and d['evidenceGrammarValid'] for d in diagnostics),
        'unsupportedAnswer': sum(d['unsupportedAnswer'] for d in diagnostics),
    }
    return {'metricsVersion': METRICS_VERSION, 'cases': len(rows), 'targetTokens': tokens,
        'targetTokenLoss': sum(r['targetTokenLoss'] * r['targetTokens'] for r in records) / tokens,
        'counts': {name: sum(d[name] for d in diagnostics) for name in diagnostics[0]},
        'formalCounts': formal, 'formalRates': {name: value / len(rows) for name, value in formal.items()}}


def aggregate(records, rows):
    result = _aggregate(records, rows)
    result['slices'] = {}
    for label, expected in (('supported', False), ('insufficient', True)):
        indices = [i for i, row in enumerate(rows) if row['expectedAbstention'] is expected]
        if not indices:
            raise ValueError('Both answerability slices are required')
        result['slices'][label] = _aggregate([records[i] for i in indices], [rows[i] for i in indices])
    return result


def gates(base, candidate):
    if any(item.get('cases') != 48 or item.get('metricsVersion') != METRICS_VERSION for item in (base, candidate)):
        raise ValueError('Fixed development population or metrics version changed')
    if any(type(item.get('targetTokenLoss')) not in (int, float) or not math.isfinite(item['targetTokenLoss'])
           or item['targetTokenLoss'] < 0 for item in (base, candidate)):
        raise ValueError('Invalid gate loss')
    counts = candidate['formalCounts']
    return {'answerabilityAtLeast95Percent': counts['correctAnswerability'] / 48 >= .95,
        'exactQuoteOrWarrantedAbstentionAtLeast95Percent': counts['exactQuoteOrWarrantedAbstention'] / 48 >= .95,
        'formatAtLeast95Percent': counts['twoLinesAndOneQuestion'] / 48 >= .95,
        'zeroUnsupportedAnswers': counts['unsupportedAnswer'] == 0,
        'lossNonRegressionAgainstUntouchedBase': candidate['targetTokenLoss'] <= base['targetTokenLoss']}
