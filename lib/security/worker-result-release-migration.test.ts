import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
const sql = readFileSync('supabase/migrations/20260929034718_worker_result_release_boundary.sql', 'utf8')
describe('worker result column boundary migration', () => {
  it('removes table and existing column grants before restoring only safe owner status reads', () => {
    expect(sql).toContain('revoke select on public.worker_jobs from public, anon, authenticated')
    expect(sql).toContain('revoke select (%s) on public.worker_jobs from public, anon, authenticated')
    const grant = sql.match(/grant select \(([^)]+)\) on public\.worker_jobs to authenticated/)?.[1]
    expect(grant).toBeDefined()
    expect(grant).toContain('status')
    expect(grant).not.toMatch(/payload|error_summary|constraints|observability/)
    expect(sql.toLowerCase()).not.toContain('disable row level security')
    expect(sql.toLowerCase()).not.toContain('drop policy')
    expect(sql).not.toMatch(/revoke[^;]+from service_role/)
  })
})
