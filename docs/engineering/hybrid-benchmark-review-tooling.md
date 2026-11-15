# Offline hybrid benchmark response review

This tool implements the frozen `hybrid-benchmark-review-protocol.md`. It does
not alter that rubric, generate ratings, call providers or authorize deployment.
It records each AI reviewer's actual context exposure and must not be presented
as human, educator or population validation. A newly spawned reviewer with only
the rubric, format instructions and packet may attest freshContext:true; a
reused engineering reviewer must attest false and describe prior exposure.

## Create packets after execution stops

```powershell
npx tsx scripts/learning/review-hybrid-benchmark.ts archive <completed-run-directory>
npx tsx scripts/learning/review-hybrid-benchmark.ts packet <run-directory> <new-review-directory>
```

For a completed run, archive the exact frozen source closure before building the
packet. Every byte must match the plan-bound code hashes. Historical review then
uses those archived bytes, allowing later workspace development without changing
what executed. Extra, missing or altered archived files are rejected. Never add
the archive after distributing a packet, since that changes its source inventory.

This verifies the saved plan at its original creation time, the frozen corpus,
rendered inputs, code closure, rubric, request identities and accepted response
receipts. It saves all 96 cases, full evaluation references, exact rendered
system/user messages and accepted output text in `packet.json`. Unavailable
responses stay in the packet as null and remain in the denominator. The response
hash is SHA-256 of the canonical JSON **string**, including its JSON quotes.
Case and packet hashes use recursively sorted, compact UTF-8 JSON. Rubric and
file hashes use raw bytes.

Give each reviewer only `packet.json` and these format instructions. Keep
`provenance.json`, run files, cost, model identity, summary outcomes and the other
review hidden during the first pass. The packet necessarily shows which cases
have no available response. Do not make a semantic judgment about withheld text.

`provenance.json` keeps the complete raw source-file hash inventory, exact local
source paths, attempt dispositions and known accounting separately. Added or
changed run files invalidate the packet. A completed run can be reviewed after
its price snapshot expires; that never authorizes another paid call.

## Two independent AI first passes

Each reviewer saves a separate new JSON file using this structure:

```typescript
type Dimension = 'accuracy' | 'teaching' | 'evidence' | 'restraint' | 'premiseIntegrity';
type Judgment = {
  pass: boolean;
  evidenceQuotes: string[]; // 1–8 exact response substrings, 3–2000 characters each
  rationale: string;       // 20–4000 characters, concrete case-specific reasoning
};
type Reviewer = {
  id: string; kind: 'ai';
  independentOfProducer: true; independentOfOtherReview: true;
  freshContext: boolean; credentialedEducator: false;
  priorProjectExposure: string; // explicit disclosure, at least 20 characters
  priorOutputExposure: string;  // explicit disclosure, at least 20 characters
};
type PrimaryReview = {
  schema: 'hybrid-primary-review-v1';
  packetHash: string; rubricSha256: string;
  reviewer: Reviewer; savedAt: string; // actual UTC ISO save time
  ratings: Array<{
    id: string; caseHash: string; responseHash: string;
    responseKind: 'abstention' | 'useful_clarification' | 'scaffolding' | 'direct_teaching';
    dimensions: Record<Dimension, Judgment>;
  }>;
  suspectedKeyErrors: Array<{
    id: string; caseHash: string; responseHash: string; details: string;
  }>;
};
```

Use every dimension exactly once and actual Booleans. Quote relevant response
wording even when the rationale concerns an omission. Evidence-substring checking
only binds the judgment to text; it does not establish semantic correctness.
Bare abstention cannot pass teaching. Useful clarification is distinct from
abstention and can pass according to the frozen protocol.

Every available response requires either a complete rating or an explicit
suspected-key-error report, never both. Report suspected key errors before
scoring those cases. They remain unresolved and prevent acceptance; this tool
cannot change the key, remove cases or adjudicate key repairs. Unavailable
responses must not receive invented ratings.

## Compare only after both files are saved

```powershell
npx tsx scripts/learning/review-hybrid-benchmark.ts disputes <review-directory> <review-one.json> <review-two.json> <new-dispute-directory>
```

The command validates both complete first passes, preserves their exact bytes,
and saves `disputes.json` plus a receipt binding their raw hashes. Give an
independent adjudicator the dispute packet. It contains only disputed Boolean
dimensions and the corresponding complete cases/responses. Response-kind
disagreements are reported separately; they are not extra acceptance criteria.

Adjudication uses this structure:

```typescript
type Adjudication = {
  schema: 'hybrid-adjudication-v1';
  disputePacketHash: string; packetHash: string; rubricSha256: string;
  reviewer: Reviewer; savedAt: string;
  ratings: Array<{
    id: string; caseHash: string; responseHash: string;
    dimension: Dimension; judgment: Judgment;
  }>;
};
```

The adjudicator must have a different identity from both primary reviewers,
disclose seeing the disputed judgments, and must not have authored either
primary review. Only disputed dimensions may be resolved. Agreed failed
dimensions cannot be reversed. Omitted disputes remain unresolved.

## Save a development-only report

```powershell
npx tsx scripts/learning/review-hybrid-benchmark.ts report <review-directory> <dispute-directory> <adjudication.json-or-dash> <new-report.json>
```

Use `-` when no adjudication is supplied. The report revalidates source artifacts,
both original reviews and preserved copies, and all adjudication bindings. All
output writes are exclusive; choose a new destination rather than overwrite an
earlier report. Review outputs must stay outside the frozen run directory.

The report retains denominator 96 and four per subject/band cell. It states
whether at least 92 cases pass all five dimensions with zero final fabricated
premises, complete review coverage and no unresolved dimensions/key issues.
Missing and withheld outputs receive no pass. Costs with no durable receipt stay
unknown rather than zero. Execution counts, known costs and recorded latencies
are separate from quality. `qualitySuccess`, `productionEligible`,
`populationAccuracyEstablished` and `educatorValidated` remain false.

The tool verifies content and record consistency. Reviewer identities,
independence, exposure disclosures and declared save times are attestations;
filesystem access alone cannot prove them or prove that an earlier file was not
re-signed before packet preparation.
