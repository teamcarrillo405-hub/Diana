# Diana — file authority (read first)

When working on the Diana student dashboard in this project, respect these file roles:

- **`Student Lobby.dc.html`** — the **pixel source of truth** for the dashboard landing page (hero + class grid). Formerly "Grayson Lobby". This is the locked design; match it exactly when building or referencing the lobby.
- **`Dashboard Plan.md`** — the **authoritative written plan** for placing the 19 built-but-unplaced components across the WORK / THINK / PROOF / FUTURE tabs. Build from this.
- **`Dashboard Plan (visual reference).dc.html`** — a clickable, lower-fidelity mock of the plan, **for humans to look at**. Illustration only — never treat it as the pixel source.
- **`docs/design/reference/my-classes-locked.png`** — the **pixel source of truth** for the `/classes` "MY CLASSES" card grid (Model B classes tab). Stateful class cards: status eyebrow (IN PROGRESS / NOT STARTED / NOT TURNED IN / TURNED IN), big class name, a task row with a due/OVERDUE/DONE badge, est/took time + progress bar, and a state-colored primary CTA (OPEN NOW cyan · START NOW red-when-overdue · TURN IN NOW gold · CONTINUE cyan-outline · REVIEW dark), optional "You're done — one tap to submit" bar, optional quiz row (FLASHCARDS / QUIZ ME), and a NOW-badged cyan-bordered focal card. Match it exactly.

Notes:
- "Grayson" / "G-Money" is just the sample student's name in mock data. The product/page is **Student Lobby** (built to serve millions of students).
- The locked visual system: deep navy `#0a1024` hero structure over a near-black `#04060f` page base, cyan `#29d0ff` accent, HUD corner-bracket motif, Saira Condensed display font. Don't invent new colors or type.
- Older snapshots in `design_handoff_grayson_lobby/` and `design_handoff_diana_lobby/` use the old "Grayson Lobby" name — they are archival; the active source is `Student Lobby.dc.html`.
