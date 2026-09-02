# Diana Cinematic Landing Media Review

## Decision Summary

- Meet Diana girl correction is accepted for local product use.
- Meet Diana primary is rejected and remains outside production assets.
- The previously accepted boy film remains untouched as a comparison baseline.
- No Grok hero film was promoted. The deterministic layered school hero remains active.
- Existing source media remains untouched.
- Public release still requires the five-student silent comprehension test.

## Meet Diana Film

### Primary Take

Status: Rejected

Reasons:

- The laptop changes shape during the shot.
- A second lamp appears during the shot.
- Those continuity artifacts break the ordinary school-night scene.

### Girl Take 1

Status: Rejected

Reasons:

- The student, desk, lighting, and laptop remain coherent.
- A generated dissolve changes to an over-shoulder camera angle near the end.
- The generated transition conflicts with the real Diana interface transition.

### Girl Correction

Status: Accepted for local review

Evidence:

- 7.5 seconds, 1920 by 1080, 24 fps, H.264, silent.
- The Meet Diana student is now a believable high-school girl.
- The same student, desk, lamp, laptop, and room remain coherent through the shot.
- The clean continuous portion remains at its native cadence and holds briefly before the real Diana interface appears, removing the generated over-shoulder dissolve without introducing judder.
- Contact-sheet review at half-second and one-second intervals found no critical face, hand, laptop, exposure, or continuity mutation in the accepted edit.
- The encoded desktop and mobile versions use frequent seek points and load anonymously from the public landing page.
- Forward and reverse scroll tests keep the film paused while scroll controls `currentTime`.

Production files:

- `public/assets/video/diana-first-line-girl-desktop-1920x1080.mp4`
- `public/assets/video/diana-first-line-girl-mobile-720x720.mp4`
- `public/assets/video/diana-first-line-girl-poster-desktop-1600x900.webp`
- `public/assets/video/diana-first-line-girl-poster-mobile-720x720.webp`

## Hero Film

Status: Not promoted

The 1920 by 1080 centered school reference was prepared, but the Grok browser upload could not be completed through the current Chrome extension session. No generated hero film was allowed into the page without inspection and comparison. The active hero therefore uses the verified sky, school, logo-mask, and cloud layers with deterministic GSAP scroll timing.

This follows the replacement rule: an unavailable or unverified candidate cannot replace the current implementation.

## Automated Acceptance

- TypeScript check: passed.
- Production build: passed.
- Tone audit: zero blocking findings.
- Middleware and motion preference tests: passed.
- Anonymous desktop and mobile MP4 requests: HTTP 200.
- Desktop viewport: 1440 by 900 checked.
- Mobile viewport: 390 by 844 checked.
- Forward and reverse hero scroll checked.
- Forward and reverse Meet Diana film scrubbing checked.
- App and system reduced-motion layouts checked.
- The hero uses one small header logo and one large masked Diana treatment.

## Independent Design Gate

Final score: 93 out of 100

Status: Passed the strict 88-point gate

The independent live reviewer verified:

- The Meet Diana student is a girl on both desktop and mobile.
- Native 24 fps cadence with no generated dissolve, transition judder, or mobile letterboxing.
- Desktop film scrubbed forward to 7.46 seconds and backward to 6.36 seconds.
- Mobile film scrubbed forward to 7.46 seconds and backward to 6.22 seconds.
- Both accepted films reached ready state 4, remained paused, and stayed controlled by scroll.
- The mobile Diana mask retained approximately 35 pixels of side clearance with no page overflow.
- Desktop and mobile reduced-motion heroes stayed at one viewport height with the headline, subhead, and CTA fully visible.
- Hero reverse states returned pixel-identically, and Meet Diana returned to the same scroll-linked frame.

Remaining critical artifacts: none.

## Public Release Gate

Run one silent view with five high-school students. At least four must:

1. Explain that the student was stuck, received one next step, and began the work.
2. Identify Diana as software rather than a person or robot.
3. Prefer the accepted candidate over the previous Meet Diana film.

Do not treat this release gate as complete until the student responses are recorded.
