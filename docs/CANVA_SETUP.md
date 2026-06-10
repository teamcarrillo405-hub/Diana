# Canva Integration — Setup

Diana's Canva integration (the design tool — not Canvas LMS) lets a student:
- one-tap a poster/slides assignment into a titled draft **in their own Canva
  account**, with a design brief built from their rubric criteria and notes;
- see their recent Canva designs in the Portfolio.

The brief is structure only ("Headline", each rubric criterion, "Sources
corner") — every point is a fill-in. The student's content stays the
student's; Diana removes the blank canvas.

## One-time admin setup (~10 minutes, free)

1. Go to https://www.canva.com/developers/ and sign in with the account that
   should own the app (any Canva account works; Canva for Education is fine).
2. Create a new **integration** ("Connect API"). Note the **Client ID** and
   generate a **Client secret**.
3. Add the redirect URL for every environment you run:
   - local: `http://localhost:3000/api/canva/callback`
   - production: `https://<your-domain>/api/canva/callback`
4. Request these scopes for the integration:
   - `design:meta:read` (list the student's designs)
   - `design:content:write` (create a draft design)
   - `profile:read`
5. Set the environment variables (in `.env.local` and in Vercel):

```
CANVA_CLIENT_ID=...
CANVA_CLIENT_SECRET=...
CANVA_REDIRECT_URI=https://<your-domain>/api/canva/callback
```

`CANVA_REDIRECT_URI` can be omitted if `NEXT_PUBLIC_SITE_URL` is set — the
callback path is derived from it.

## How it behaves

- **No keys set** → every Canva surface degrades to setup guidance; nothing
  breaks. The Settings card says setup is pending.
- **Keys set, student not connected** → Settings shows a Connect button
  (OAuth with PKCE). Tokens are stored per student (`canva_connections`,
  owner-only RLS) and refresh automatically.
- **Connected** → visual assignments (kind `presentation`, or titles
  mentioning poster/slides/infographic/etc.) show the "Start this in Canva"
  panel; Portfolio shows the recent-designs strip; Settings allows
  disconnecting (deletes the stored tokens).

## API honesty note

Canva's Connect API cannot inject arbitrary text into a new design (that
requires enterprise brand-template autofill). Diana therefore creates the
titled draft and presents the brief alongside, with one-tap copy — the
student pastes and builds. If brand-template autofill becomes available on
the account later, `createCanvaDesign` in `lib/integrations/canva.ts` is the
place to upgrade.
