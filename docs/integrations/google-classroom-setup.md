# Google Classroom — OAuth setup (wiring `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`)

Diana's hardened Classroom flow (`lib/lms/google.ts`, `app/api/lms/google-oauth/*`)
needs a Google Cloud OAuth client so it can store a refresh token and sync in the
background. This is deployment config — the code is already shipped and reads:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Until both are set, the connect button returns `?classroom=not-configured`
(graceful) and existing connections fall back to the session-token path.

## 1. Google Cloud Console

1. Pick/create a GCP project → **APIs & Services → Library** → enable **Google Classroom API**.
2. **OAuth consent screen**: External; add app name, support email, developer email.
   Add these scopes (read-only — matches `GOOGLE_CLASSROOM_SCOPES` in `lib/lms/google.ts`):
   - `.../auth/classroom.courses.readonly`
   - `.../auth/classroom.coursework.me.readonly`
   - `.../auth/classroom.announcements.readonly`
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

## Notes

- Mirrors the existing Canvas OAuth setup (`CANVAS_CLIENT_ID`/`CANVAS_CLIENT_SECRET`).
- The cron also needs `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` (already used by
  the push/parent-digest crons).
