/** Existing synthetic operator only. Session tokens stay in memory; this script cannot create/reset users. */
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadEnvConfig } from '@next/env'
import { createClient, type Session } from '@supabase/supabase-js'
import { executeBenchmark, verifyBenchmark } from './hybrid-benchmark'

const url = 'https://oitipayrriupcitgmzju.supabase.co'
const operator = 'ad37c468-67f5-4b5f-9e28-b5e947a4075c'

async function main() {
  const [command, artifactDirectory, approvalFile] = process.argv.slice(2)
  if (!['preflight', 'execute'].includes(command) || !artifactDirectory) throw new Error('Use preflight|execute <artifact-directory> [approval-file]')
  loadEnvConfig(process.cwd())
  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== url) throw new Error('Research project URL differs from the approved target')
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!key) throw new Error('Supply the approved project publishable key privately through the environment')
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false } })
  const acceptSession = (session: Session | null) => {
    if (!session || session.user.id !== operator || !session.expires_at || session.expires_at * 1000 <= Date.now()) {
      delete process.env.DIANA_HYBRID_OPERATOR_ACCESS_TOKEN
      return false
    }
    process.env.DIANA_HYBRID_OPERATOR_ACCESS_TOKEN = session.access_token
    return true
  }
  const { data: subscription } = client.auth.onAuthStateChange((_event, session) => { acceptSession(session) })
  try {
    const auth = await client.auth.signInWithPassword({
      email: process.env.QA_GRAYSON_TEST_EMAIL ?? 'grayson-qa-student@local.test',
      password: process.env.QA_TEST_PASSWORD ?? 'Diana-QA-Visual-Gate-2026!',
    })
    if (auth.error || !acceptSession(auth.data.session)) throw new Error('Existing synthetic operator sign-in could not be verified')
    const { plan } = await verifyBenchmark(process.cwd(), resolve(artifactDirectory))
    const profile = await client.from('profiles').select('user_id,age_bracket,consent_ai,daily_token_budget,token_reset_date,tokens_used_today').eq('user_id', operator).single()
    if (profile.error || !profile.data || profile.data.consent_ai !== true || !['13_to_17', 'adult'].includes(profile.data.age_bracket)) {
      throw new Error('Synthetic operator eligibility could not be verified')
    }
    console.log(JSON.stringify({ status: 'operator-preflight-passed', operator, planFingerprint: plan.fingerprint,
      sessionExpiresAt: auth.data.session!.expires_at, sessionRenewal: 'same-owner-memory-only',
      dailyTokenBudget: profile.data.daily_token_budget, paidRequestsMadeByPreflight: 0 }))
    if (command === 'execute') {
      if (!approvalFile) throw new Error('Exact approved-plan file is required')
      client.auth.startAutoRefresh()
      await executeBenchmark(process.cwd(), resolve(artifactDirectory), resolve(approvalFile))
      console.log(JSON.stringify({ status: 'execution-complete', semanticAcceptance: false }))
    }
  } finally {
    subscription.subscription.unsubscribe()
    await client.auth.stopAutoRefresh()
    await client.auth.signOut({ scope: 'local' })
    delete process.env.DIANA_HYBRID_OPERATOR_ACCESS_TOKEN
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error instanceof Error ? error.message : 'Research operator error'); process.exitCode = 1 })
}
