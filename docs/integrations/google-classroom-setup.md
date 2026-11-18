# Google Classroom and Calendar — OAuth setup

Diana's hardened Google connection (`lib/lms/google.ts`, `app/api/lms/google-oauth/*`)
needs a Google Cloud OAuth client so it can store a refresh token and sync in the
background. This is deployment config — the code is already shipped and reads:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `DIANA_GOOGLE_CALENDAR_ENABLED` for the separate read-only Calendar connection
- `DIANA_LMS_GOOGLE_IMPORT_ENABLED`
- `DIANA_LMS_GOOGLE_SUBMISSION_ENABLED`

Both client credentials are required. Each feature also requires its explicit
switch. Missing credentials return `?classroom=not-configured`; disabled features
return `?classroom=disabled`. Expired, revoked, or incomplete credentials fail closed with
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
2. The `google_classroom` row in `lms_connections.config` contains public grant
   metadata. Access and refresh tokens are stored in the service-only
   `integration_credentials` vault through `upsert_integration_connection`.
3. Background sync (`/api/cron/lms-sync`, every 6h via `vercel.json`) will then
   refresh and sync Classroom automatically. Manual: the "Sync now" button.
4. Run `npm run provider:canary` for the credential-free provider contract. See
   `docs/integrations/provider-canary.md` before enabling real staging writes.
5. Keep both provider feature switches disabled until the corresponding
   disposable-course certification passes. Import and submission are certified
   independently, so import may be enabled while submission remains disabled.

### Google Calendar

Use an existing Web application OAuth client where appropriate. Register the exact
production redirect `https://diana-umber.vercel.app/api/lms/google-oauth/callback`,
enable the Google Calendar API, and configure the shared client credentials in
Vercel. Set `DIANA_GOOGLE_CALENDAR_ENABLED=true` independently from the Classroom
flags. Leave Classroom import and submission disabled until their own certification.
The production credential vault table and atomic writer must be available.

1. Open `/calendar` and choose **Connect** in the Google Calendar section.
2. Calendar requests only `openid`, `email`, and `calendar.readonly`. It does not
   request Classroom or Drive access or import Classroom assignments. Google may
   include previously granted scopes when the same client is reconnected.
   Diana preserves those grants and the connection's student/teacher mode; it
   rejects a narrower token before overwriting an existing LMS credential.
   A legacy LMS connection without recorded scopes needs a Classroom reconnect
   before Calendar can safely add its grant.
3. Diana can read
   upcoming events but cannot create, change, or delete them.
4. Diana stores those events separately from assignments. A personal calendar event never
   becomes homework and opening one takes the student back to Google Calendar.
5. The callback and **Sync Google Calendar** action reconcile a complete primary
   calendar snapshot. The panel shows its last successful sync and imported range.
   The Classroom background cron does not refresh Google Calendar.
6. Verify consent, callback return to the selected Calendar date/view/item, manual
   sync, expiry/reconnect, and deletion reconciliation with a real test account.
   Mock contract tests cannot certify the OAuth client, audience, or API access.

## Notes

- Mirrors the existing Canvas OAuth setup (`CANVAS_CLIENT_ID`/`CANVAS_CLIENT_SECRET`).
- The cron also needs `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` (already used by
  the push/parent-digest crons).
