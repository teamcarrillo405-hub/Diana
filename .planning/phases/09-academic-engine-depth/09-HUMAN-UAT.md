---
status: partial
phase: 09-academic-engine-depth
source: [09-VERIFICATION.md]
started: 2026-05-30T00:00:00Z
updated: 2026-05-30T00:00:00Z
---

## Current Test

[awaiting human testing — Google Classroom OAuth]

## Tests

### 1. Google Classroom OAuth sync

expected: Navigate to Settings > Connected calendars → click "Connect Google Classroom" → complete OAuth consent with classroom.courses.readonly + classroom.coursework.me.readonly scopes → lms_connections row written with provider = 'google_classroom' → assignments import correctly with external_source='google_classroom'

Prerequisites:
1. GCP Console → Enable Google Classroom API
2. GCP Console → OAuth consent screen → add scopes: classroom.courses.readonly, classroom.coursework.me.readonly
3. Supabase Dashboard → Auth → Providers → Google → Additional Scopes: https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly
4. Sign out and back in with Google to get a fresh token with the new scopes

result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
