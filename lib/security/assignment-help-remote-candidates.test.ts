import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash, webcrypto } from 'node:crypto'
import { runInNewContext } from 'node:vm'
import { build } from 'esbuild'
import { beforeAll, describe, expect, it, vi } from 'vitest'

const root = resolve('artifacts/learning-engine/research/edge-assistance-candidates-v1')
const owner = '11111111-1111-4111-8111-111111111111'
const assignment = '22222222-2222-4222-8222-222222222222'
const note = '44444444-4444-4444-8444-444444444444'
const cases = [
  { label: 'math SSE', slug: 'math-step', body: { prompt: 'Which operation comes next?', history: [], stream: true } },
  { label: 'history text', slug: 'history-scaffold', body: { mode: 'primary_source', sourceText: 'The fictional town record reports a closed bridge.', classContext: 'Source interpretation' } },
  { label: 'history image', slug: 'history-scaffold', body: { mode: 'map_annotation', storageKey: owner + '/map.png', bucket: 'note-docs' } },
  { label: 'realtime capability', slug: 'assignment-realtime', body: { context: 'Owned assignment context and student attempt.' } },
  ...[
    ['math-example', { problem: 'Solve 2x + 3 = 9', subject: 'algebra' }],
    ['math-scaffold', { problemText: 'Solve 2x + 3 = 9' }],
    ['reading-scaffold', { type: 'pre', text: 'The fictional town has a bridge and a water tower.' }],
    ['reading-level', { target: 'simpler', text: 'The fictional town has a bridge and a water tower.' }],
    ['vocab-hover', { word: 'bridge', context: 'The bridge crosses the river.' }],
    ['writing-aid', { prompt: 'Help organize my paragraph.', history: [] }],
    ['writing-cowrite', { mode: 'essay_scaffold', prompt: 'Compare two sources.' }],
    ['science-scaffold', { mode: 'hypothesis', prompt: 'How does light affect plant growth?' }],
    ['cs-scaffold', { mode: 'error_hint', code: 'print(value)', prompt: 'value is undefined' }],
    ['language-scaffold', { mode: 'reading', sourceText: 'La casa tiene una puerta.' }],
    ['arts-scaffold', { mode: 'art_reflection', prompt: 'Explain my use of line.' }],
    ['health-scaffold', { mode: 'sleep_recovery', prompt: 'Interpret the supplied chart.' }],
    ['ap-scaffold', { mode: 'frq_outline', prompt: 'Compare the supplied sources.' }],
    ['citation-gen', { sourceType: 'paste', sourceText: 'Synthetic source title and author.', formats: ['mla'] }],
    ['study-artifacts', { sourceType: 'assignment', artifactType: 'study_guide', studyMode: 'guided_steps', sourceText: 'Synthetic classroom source about bridges and rivers.' }],
    ['assignment-review', { fields: [{ label: 'Draft', value: 'My source says the bridge is closed.' }] }],
    ['assignment-realtime-reason', { context: 'Assignment source content.', question: 'Which observation is relevant?' }],
    ['task-breakdown', { title: 'Compare two sources', kind: 'essay' }],
    ['note-synthesis', { query: 'Explain my source notes.' }],
    ['visual-tools', { mode: 'mind_map', text: 'The fictional town has a bridge and a water tower.' }],
  ].map(([slug, body]) => ({ label: String(slug), slug: String(slug), body: body as Record<string, unknown> })),
  { label: 'diagram image', slug: 'visual-tools', body: { mode: 'diagram_annotation', storageKey: owner + '/map.png' } },
  { label: 'note-derived artifact', slug: 'study-artifacts', body: { sourceType: 'note', sourceId: note, artifactType: 'study_guide', studyMode: 'guided_steps', sourceText: 'Synthetic classroom source about bridges and rivers.' } },
]
const bundles = new Map<string, string>()
const noop = 'export const resetBudgetIfNewDay=async()=>{}; export const incrementTokens=async()=>{}; export const logInteraction=async()=>{};'
beforeAll(async () => {
  for (const slug of new Set(cases.map(item => item.slug))) for (const version of ['baseline', 'candidate']) {
    const result = await build({ entryPoints: [resolve(root, slug, version, 'functions', slug, 'index.ts')], bundle: true,
      write: false, format: 'cjs', platform: 'node', plugins: [{ name: 'stub-io-only', setup(builder) {
        builder.onResolve({ filter: /^(jsr:)|\/(student-auth|student-handler|safety|adaptation|homework-adapter)\.ts$/ }, args => ({ path: args.path, namespace: 'io' }))
        builder.onLoad({ filter: /.*/, namespace: 'io' }, args => {
          const contents = args.path.includes('edge-runtime') ? '' : args.path.includes('supabase-js')
            ? 'export const createClient=()=>globalThis.testIO.client;'
            : args.path.endsWith('student-auth.ts') ? 'export const requireStudentContext=async()=>globalThis.testIO.auth;'
            : args.path.endsWith('student-handler.ts') ? 'export const withStudentSecurity=(_feature,handler)=>handler;'
            : args.path.endsWith('adaptation.ts') ? 'export const adaptationLineForOwner=async()=>null;'
            : args.path.endsWith('homework-adapter.ts') ? 'export const runOpenAIHomeworkAdapter=(params)=>globalThis.testIO.provider(params);'
            : noop + 'export const contentByteLength=value=>new TextEncoder().encode(JSON.stringify(value)).byteLength; export const checkTokenBudget=async()=>({allowed:true}); export const callSafeStudentTextModel=(params)=>globalThis.testIO.provider(params); export const estimateTokenReservation=()=>100; export const aiGuardFailureResponse=()=>new Response(null,{status:503}); export const runSafeBudgetedAiCall=async(params)=>({ok:true,value:await params.invoke({markProviderUsage:()=>{}})});'
          return { contents, loader: 'js' }
        })
      } }] })
    bundles.set(slug + ':' + version, result.outputFiles[0].text)
  }
})

function runtime(slug: string, version: string, enabled: boolean) {
  const order: string[] = []
  const rpc = vi.fn(async (_name: string, args: Record<string, unknown>): Promise<unknown> => {
    order.push('receipt')
    return { error: null, data: receipt(args) }
  })
  const client = { rpc, auth: { getUser: async () => ({ data: { user: { id: owner } }, error: null }) }, from: (table: string) => {
    const data = table === 'notes' ? [{ id: note, title: 'Synthetic source', body_text: 'The fictional town bridge is closed.', assignment_id: assignment }]
      : table === 'assignments' ? { title: 'Compare sources', description: 'Use source evidence.', classes: { name: 'History', ai_mode: 'green' } }
      : table === 'assignment_sources' ? [{ id: note, title: 'Source', extracted_text: 'The fictional town bridge is closed.' }]
      : table === 'assignment_source_chunks' ? [{ source_id: note, page_label: 'p1', content: 'The fictional town bridge is closed.', ordinal: 1 }]
      : { interests: [] }
    const chain = { select: () => chain, eq: () => chain, in: () => chain, order: () => chain, limit: () => chain, is: () => chain,
      single: async () => ({ data }), maybeSingle: async () => ({ data }), insert: async () => ({ error: null }),
      then: (accept: (value: unknown) => unknown) => Promise.resolve({ data, error: null }).then(accept) }
    return chain
  },
    storage: { from: () => ({ download: async () => ({ error: null, data: new Blob(['synthetic image'], { type: 'image/png' }) }) }) } }
  const provider = vi.fn(async (_params: unknown) => { order.push('provider'); return { content: 'Which source detail supports your next step?', tokens: 10, model: 'stub-model' } })
  const fetch = vi.fn(async (url: string, _options: unknown) => {
    order.push('provider')
    return new Response(JSON.stringify(url.endsWith('client_secrets')
      ? { value: 'ek_stub_only', expires_at: 1_800_000_000, session: { id: 'session_stub', model: 'stub-realtime' } }
      : { choices: [{ message: { content: slug === 'math-scaffold' ? '{"problemText":"2x + 3 = 9","latex":null}' : '{"title":"Synthetic map"}' } }], usage: { prompt_tokens: 8, completion_tokens: 2 } }))
  })
  let handler!: (request: Request) => Promise<Response>
  const runtimeModule = { exports: {} }
  runInNewContext(bundles.get(slug + ':' + version)!, { module: runtimeModule, exports: runtimeModule.exports,
    Deno: { serve: (value: typeof handler) => { handler = value }, env: { get: (name: string) => name === 'DIANA_DURABLE_TASK_ASSISTANCE_ENABLED' ? String(enabled)
      : ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'OPENAI_API_KEY'].includes(name) ? 'stub-only' : undefined } },
    testIO: { client, provider, auth: { ownerId: owner, userClient: client, serviceClient: client } },
    fetch, crypto: webcrypto, Request, Response, Headers, Blob, TextEncoder, TextDecoder, ReadableStream, Uint8Array,
    btoa, console, setTimeout, clearTimeout })
  return { rpc, provider, fetch, order, async run(body: Record<string, unknown>) {
    return handler(new Request('https://functions.invalid/' + slug, { method: 'POST', headers: { Authorization: 'Bearer stub-only' }, body: JSON.stringify({
      ownerId: owner, assignmentId: assignment, aiMode: 'green', idempotencyKey: 'stable-operation', ...body }) }))
  } }
}
function receipt(args: Record<string, unknown>) {
  return { schemaVersion: 'assignment-assistance-v1', scope: 'assignment', requestId: args.p_request, ownerId: owner,
    assignmentId: args.p_assignment, selectedProblemId: null, payloadSha256: args.p_payload_sha256, channel: 'api',
    kind: args.p_kind, independenceBlocked: true, recordedAt: '2026-09-29T00:00:00Z' }
}
function providerInputs(value: ReturnType<typeof runtime>) {
  return { text: value.provider.mock.calls.map(([params]) => { const { supabase: _client, ...rest } = params as Record<string, unknown>; return JSON.parse(JSON.stringify(rest)) }),
    http: value.fetch.mock.calls.map(([url, options]) => ({ url, ...options as Record<string, unknown> })) }
}
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')

describe('remote-based staged candidates, actual entry code with stub IO', () => {
  it.each(cases)('$label preserves deployed prompt, provider settings and response with flag off', async item => {
    const baseline = runtime(item.slug, 'baseline', false), candidate = runtime(item.slug, 'candidate', false)
    const old = await baseline.run(item.body), next = await candidate.run(item.body)
    expect(old.status).toBe(200); expect(next.status).toBe(200)
    expect(await next.text()).toBe(await old.text())
    expect(providerInputs(candidate)).toEqual(providerInputs(baseline))
    expect(candidate.rpc).not.toHaveBeenCalled()
  })
  it.each(cases)('$label awaits exact receipt, then preserves deployed provider recipe', async item => {
    const baseline = runtime(item.slug, 'baseline', false), candidate = runtime(item.slug, 'candidate', true)
    await baseline.run(item.body)
    let settle!: (value: unknown) => void
    candidate.rpc.mockImplementation(() => new Promise(resolve => { settle = resolve }))
    const pending = candidate.run(item.body)
    await vi.waitFor(() => expect(candidate.rpc).toHaveBeenCalledOnce())
    expect(candidate.provider).not.toHaveBeenCalled(); expect(candidate.fetch).not.toHaveBeenCalled()
    const args = candidate.rpc.mock.calls[0][1]
    settle({ data: receipt(args), error: null })
    expect((await pending).status).toBe(200)
    expect(providerInputs(candidate)).toEqual(providerInputs(baseline))
    const inputs = providerInputs(candidate)
    const recipe = inputs.text[0] ?? JSON.parse((inputs.http[0] as Record<string, unknown>).body as string)
    expect(args.p_payload_sha256).toBe(hash(JSON.stringify({ protocol: 'edge-assignment-help-v1', feature: item.slug,
      ownerId: owner, assignmentIds: [assignment], sourceNoteIds: item.slug === 'note-synthesis' || item.label === 'note-derived artifact' ? [note] : [], assignmentId: assignment, requestId: args.p_request,
      channel: 'api', kind: item.slug === 'math-step' ? 'hint' : item.slug === 'math-example' ? 'example' : item.slug === 'assignment-review' ? 'check' : 'guide', recipe })))
  })
  it.each(cases)('$label blocks all provider/output/capability release when receipt mismatches', async item => {
    const candidate = runtime(item.slug, 'candidate', true)
    candidate.rpc.mockImplementation(async (_name, args) => ({ error: null, data: { ...receipt(args), payloadSha256: '0'.repeat(64) } }))
    const response = await candidate.run(item.body)
    expect(response.status).toBe(503)
    expect(await response.text()).not.toMatch(/ek_stub|source detail|Synthetic map|data:/)
    expect(candidate.provider).not.toHaveBeenCalled(); expect(candidate.fetch).not.toHaveBeenCalled()
  })
  it('preserves every original non-entry dependency and binds every candidate file hash', () => {
    const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'))
    expect(manifest.deployed).toBe(false)
    expect(manifest.functions).toHaveLength(23)
    for (const fn of manifest.functions) {
      const raw = readFileSync(resolve(root, fn.slug, 'remote-source.json'))
      expect(hash(raw)).toBe(fn.remoteSourceSha256)
      const remote = JSON.parse(raw.toString('utf8'))
      for (const file of fn.files) {
      const bytes = readFileSync(resolve(root, fn.slug, 'candidate', file.name))
      expect(hash(bytes)).toBe(file.candidateSha256)
      if (file.baselineSha256) expect(hash(remote.files.find((item: { name: string }) => item.name === file.name).content)).toBe(file.baselineSha256)
      if (file.baselineSha256 && file.name !== fn.entry) {
        expect(bytes.equals(readFileSync(resolve(root, fn.slug, 'baseline', file.name)))).toBe(true)
        expect(file.unchanged).toBe(true)
      }
      if (file.name.includes('homework-adapter')) expect(file.unchanged).toBe(true)
      }
    }
  })
  it('preserves math photo extraction but blocks instructional invocation until the receipt', async () => {
    const body = { storageKey: owner + '/equation.png' }
    const baseline = runtime('math-scaffold', 'baseline', false), candidate = runtime('math-scaffold', 'candidate', true)
    const old = await baseline.run(body)
    let settle!: (value: unknown) => void
    candidate.rpc.mockImplementation(() => new Promise(resolve => { settle = resolve }))
    const pending = candidate.run(body)
    await vi.waitFor(() => expect(candidate.rpc).toHaveBeenCalledOnce())
    // Source extraction is not pedagogical assistance and is unchanged.
    expect(candidate.fetch).toHaveBeenCalledOnce()
    expect(candidate.provider).not.toHaveBeenCalled()
    const args = candidate.rpc.mock.calls[0][1]
    settle({ data: receipt(args), error: null })
    const next = await pending
    expect(next.status).toBe(200); expect(await next.text()).toBe(await old.text())
    expect(providerInputs(candidate)).toEqual(providerInputs(baseline))
  })
  it.each(['assignment', 'note'])('rejects omitted %s artifact identity before provider use', async sourceType => {
    const candidate = runtime('study-artifacts', 'candidate', true)
    const response = await candidate.run({ assignmentId: undefined, sourceType, artifactType: 'study_guide', studyMode: 'guided_steps', sourceText: 'Synthetic classroom source about bridges and rivers.' })
    expect(response.status).toBe(400)
    expect(candidate.provider).not.toHaveBeenCalled(); expect(candidate.fetch).not.toHaveBeenCalled()
  })
  it('assignment-review binds the actual retrieved source chunk in its recipe', async () => {
    const candidate = runtime('assignment-review', 'candidate', true)
    expect((await candidate.run({ fields: [{ label: 'Draft', value: 'My bridge evidence.' }] })).status).toBe(200)
    const params = candidate.provider.mock.calls[0][0] as Record<string, unknown>
    expect(params.user).toContain('[Source: Source | p1]')
    expect(params.user).toContain('The fictional town bridge is closed.')
    expect(candidate.order).toEqual(['receipt', 'provider'])
  })
})
