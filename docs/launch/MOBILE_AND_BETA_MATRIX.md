# Mobile and Beta Matrix

## Device Matrix

| Target | Required smoke |
|--------|----------------|
| iOS Safari | Install PWA, open `/offline`, share image/text to `/api/share-target`, save a note, review a flashcard. |
| Android Chrome | Install PWA, offline note save, reconnect sync, flashcard review, assignment status update. |
| iPad/tablet | Split-view layout, keyboard navigation, note reading/TTS, collaborative notes. |
| Desktop Chrome/Edge | Dashboard, assignment detail, AI tools, export/privacy, groups, insights. |

## Beta Rollout

| Step | Exit criterion |
|------|----------------|
| 10-student private beta | Each tester completes one assignment, one note, one review session, and one privacy export. |
| Accessibility pass | At least one keyboard-only pass and one screen-reader pass over the core routes. |
| Parent/teacher smoke | Student creates and revokes a parent link and opens teacher snapshot controls. |
| Collaboration smoke | Student creates a room, shares a deck, edits group notes, and adds project tasks. |
| Retention dry run | Service-role job runs against a non-production request and records `data_retention_runs`. |

## Feedback Intake

Capture feedback by route, task, device, accommodation setting, and whether AI was red/yellow/green. Do not collect public rankings or compare students against each other.
