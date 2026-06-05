# Open Source Integration Map

Downloaded under `vendor/open-source/` and ignored by Git:
- `OpenJarvis` from `open-jarvis/OpenJarvis`
- `leantime` from `Leantime/leantime`
- `nextcloud-server` from `nextcloud/server`
- `languagetool` from `languagetool-org/languagetool`

## Diana Use

OpenJarvis informs Diana's future voice mode: local-first posture, command registry, daily briefing, and visible manual voice control. Diana should not restore passive wake standby without a clear student-controlled recording indicator.

Leantime informs school project planning: milestones, my-work dashboard, idea boards, and neurodivergent-friendly project language. Because Leantime is AGPL/PHP, Diana reimplements the concepts in TypeScript instead of copying code.

Nextcloud informs a future source vault: student-owned files, WebDAV/CalDAV-style connectors, permissioned sharing, and source-first storage. Because Nextcloud is AGPL/PHP, Diana should integrate through optional connectors rather than bundling it.

LanguageTool gives Diana a safe writing-mechanics path: grammar/spelling suggestions from a local HTTP service, source anchored to the student's own draft, with student choice required before accepting changes.

## Build Boundary

Diana remains a Next.js/Supabase app. These projects are reference installs, not embedded dependencies. The implemented code boundary is:
- `lib/integrations/open-source-programs.ts` for the feature map.
- `lib/language-tool/client.ts` for a future LanguageTool HTTP service adapter.

## Next Product Moves

1. Add a writing mechanics panel to Writing Studio using `LANGUAGETOOL_URL`.
2. Add a source-vault connector plan for Nextcloud/WebDAV uploads.
3. Add a student project milestone view using Leantime-inspired milestone language.
4. Add a manual voice command palette inspired by OpenJarvis command presets.
