-- F13/F14 — Student-initiated share links for parent summary + teacher snapshot.
-- Tokens are URL-safe UUIDs. Owner manages their own rows via RLS.
-- Public route (/share/[token]) uses service-role client to bypass RLS — see lib/supabase/service.ts.

CREATE TABLE share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  owner_id uuid REFERENCES auth.users NOT NULL,
  share_type text NOT NULL CHECK (share_type IN ('parent_summary', 'teacher_snapshot')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner can manage" ON share_links
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Index for owner-side listing of active links
CREATE INDEX share_links_owner_active_idx
  ON share_links (owner_id, share_type)
  WHERE revoked_at IS NULL;

-- Index for token lookup from public route
CREATE INDEX share_links_token_idx ON share_links (token);

-- No public read policy. The public /share/[token] route MUST use the service-role
-- client and MUST scope every downstream query to owner_id from the row.
