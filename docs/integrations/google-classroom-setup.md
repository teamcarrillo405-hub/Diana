# Google Classroom and Calendar — OAuth setup

Diana's hardened Google connection (`lib/lms/google.ts`, `app/api/lms/google-oauth/*`)
needs a Google Cloud OAuth client so it can store a refresh token and sync in the
background. This is deployment config — the code is already shipped and reads:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `DIANA_LMS_GOOGLE_IMPORT_ENABLED`
- `DIANA_LMS_GOOGLE_SUBMISSION_ENABLED`

Until both are set, the connect button returns `?classroom=not-configured`
(graceful). Expired, revoked, or incomplete credentials fail closed with
`reconnect_required`; Diana never falls back to an untracked browser token.

## 1. Google Cloud Console

1. Pick/create a GCP project → **APIs & Services → Library** → enable **Google Classroom API** and **Google Calendar API**.
2. **OAuth consent screen**: External; add app name, support email, developer email.
   Add these student scopes (matches `GOOGLE_CLASSROOM_SCOPES` in `lib/lms/google.ts`):
   - `.../auth/classroom.courses.readonly`
   - `.../auth/classroom.coursework.me`
   - `.../auth/drive.readonly`
   - `.../auth/drive.file`
   - `.../auth/calendar.readonly` for the optional, read-only Calendar connection
   - `openid`, `email`
   While in "Testing", add each tester's Google account; publish to remove that limit.
3. **Credentials → Create credentials → OAuth client ID → Web application.**
   - **Authorized redirect URIs** (add every environment that will connect):
     - Production: `https://<your-domain>/api/lms/google-oauth/callback`
     - Preview (if used): `https://<preview-domain>/api/lms/google-oauth/callback`
     - Local dev: `http://localhost:3000/api/lms/google-oauth/callback`
   - Copy the generated **Client ID** and **Client secret**.

## 2. Set the env vars

Never commit these. Set them where the app runs:

- **Vercel** (prod + preview + development as needed):
  `vercel env add GOOGLE_CLIENT_ID` then `vercel env add GOOGLE_CLIENT_SECRET`
  (or Project → Settings → Environment Variables in the dashboard). Redeploy.
- **Local dev**: add to `.env.local`:
  ```
  GOOGLE_CLIENT_ID=...
  GOOGLE_CLIENT_SECRET=...
  ```

## 3. Verify

1. `/settings` → **Connect Google Classroom** → Google consent → returns to
   `/settings?classroom=connected` (not `not-configured`).
2. The `google_classroom` row in `lms_connections.config` now has a `refresh_token`.
3. Background sync (`/api/cron/lms-sync`, every 6h via `vercel.json`) will then
   refresh and sync Classroom automatically. Manual: the "Sync now" button.
4. Run `npm run provider:canary` for the credential-free provider contract. See
   `docs/integrations/provider-canary.md` before enabling real staging writes.
5. Keep both provider feature switches disabled until the corresponding
   disposable-course certification passes. Import and submission are certified
   independently, so import may be enabled while submission remains disabled.

### Google Calendar

1. Open `/calendar` and choose **Connect** in the Google Calendar section.
2. The consent screen requests the additional `calendar.readonly` scope. Diana can read
   upcoming events but cannot create, change, or delete them.
3. Diana stores those events separately from assignments. A personal calendar event never
   becomes homework and opening one takes the student back to Google Calendar.

## Notes

- Mirrors the existing Canvas OAuth setup (`CANVAS_CLIENT_ID`/`CANVAS_CLIENT_SECRET`).
- The cron also needs `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` (already used by
  the push/parent-digest crons).
