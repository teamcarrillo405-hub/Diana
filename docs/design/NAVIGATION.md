# Navigation

## AI agent placement (locked decision)

Only /voice calls the real Diana AI model today. /study-buddy and /break-down are template and heuristic based, not real model calls. Confirmed direction, these two should eventually be upgraded to call the real AI model the same way voice does. This is a separate backend engineering task, not a design task. Do not start this work until it is explicitly scoped as its own project.

## Voice entry point (locked decision)

/voice gets a prominent, persistent entry point on the redesigned Work page (Mission Board), placed alongside the Start Now panel. This is a general purpose AI agent, not tied to any single assignment, so it deserves visible placement on Work rather than staying buried in the More drawer. Implement this as part of the current Mission Board build.
