const verified = (evidence) => ({
  truth: 'verified',
  evidence,
})

const illustrative = (label) => ({
  truth: 'illustrative',
  label,
  disclosure: 'A fictional, student-safe example of verified Diana behavior.',
})

export const navigation = {
  id: 'navigation',
  brand: 'DIANA',
  links: [
    { id: 'nav-how-it-works', label: 'How It Works', href: '#how-it-works' },
    { id: 'nav-meet-diana', label: 'Not a Chatbot', href: '#meet-diana' },
    { id: 'nav-what-diana-does', label: 'How Diana Helps', href: '#how-diana-helps' },
    { id: 'nav-your-control', label: 'Your Control', href: '#your-control' },
  ],
  cta: {
    id: 'nav-create-account',
    kind: 'primary',
    label: 'Get Early Access',
    href: '/signup',
  },
}

export const hero = {
  id: 'top',
  eyebrow: 'YOUR AI TUTOR',
  headline: 'Stuck On Homework?',
  body: 'Diana shows you where to start, then helps you work through it.',
  storyBeats: [
    {
      id: 'hero-night',
      eyebrow: 'SCHOOL NIGHT',
      headline: 'Make tonight smaller',
      body: 'One place to start',
    },
    {
      id: 'hero-context',
      eyebrow: 'SORT THE NIGHT',
      headline: 'See what matters',
      body: 'Classes, due dates, and energy in one view',
    },
    {
      id: 'hero-first-move',
      eyebrow: 'FIRST MOVE',
      headline: 'Start with one step',
      body: 'A page, a paragraph, or one question',
    },
    {
      id: 'hero-start',
      eyebrow: 'YOUR WORK',
      headline: 'Stay in control',
      body: 'Diana gives the next step',
      cta: true,
      trustLine: 'You do the work',
    },
  ],
  film: {
    desktop: '/assets/hero/diana-hero-scroll-film-1280x720.mp4',
    duration: 10.04,
    poster: '/assets/hero/diana-hero-scroll-poster-1280x720.webp',
    mobilePoster: '/assets/hero/diana-hero-scroll-poster-mobile-390x844.webp',
    frames: [
      {
        beatId: 'hero-night',
        poster: '/assets/hero/diana-hero-scroll-poster-1280x720.webp',
        mobilePoster: '/assets/hero/diana-hero-scroll-poster-mobile-390x844.webp',
      },
      {
        beatId: 'hero-context',
        poster: '/assets/hero/diana-hero-scroll-beat-context-1280x720.webp',
        mobilePoster: '/assets/hero/diana-hero-scroll-beat-context-mobile-390x844.webp',
      },
      {
        beatId: 'hero-first-move',
        poster: '/assets/hero/diana-hero-scroll-beat-first-move-1280x720.webp',
        mobilePoster: '/assets/hero/diana-hero-scroll-beat-first-move-mobile-390x844.webp',
      },
      {
        beatId: 'hero-start',
        poster: '/assets/hero/diana-hero-scroll-beat-start-1280x720.webp',
        mobilePoster: '/assets/hero/diana-hero-scroll-beat-start-mobile-390x844.webp',
      },
    ],
  },
  primaryCta: {
    id: 'hero-create-account',
    kind: 'primary',
    label: 'Get Early Access',
    href: '/signup',
  },
  meta: verified([
    'High-school student audience',
    'Ranked next-move workflow',
    'Final-answer and ghostwriting safeguards',
  ]),
}

export const coachStory = {
  id: 'meet-diana',
  eyebrow: '',
  headline: "This Isn't Just a ChatBot",
  body: '',
  closingPhrases: ["It's About Help", 'Progress', 'Getting Unstuck'],
  dashboard: {
    alt: 'Two students working at one table with the Diana Today homework workspace visible on the central computer screen.',
    height: 941,
    src: '/assets/dashboard/diana-students-today-monitor-cutout.png',
    width: 1672,
  },
  hotspots: [
    {
      id: 'homework-context',
      body: 'Homework opens with the assignment, class, due date, and work area together.',
      label: 'Homework context',
      x: 41.7,
      y: 42.8,
    },
    {
      id: 'check-in',
      body: 'Energy, sleep, and meals help Diana adjust pacing without turning it into a lecture.',
      label: 'Health check-in',
      x: 42.3,
      y: 57.8,
    },
    {
      id: 'live-diana',
      body: 'Live help is built into the workspace, so students can ask while they work.',
      label: 'Live Diana',
      x: 51.5,
      y: 43.8,
    },
    {
      id: 'week-progress',
      body: 'Progress stays visible across the week instead of living in a separate tracker.',
      label: 'Week view',
      x: 51.4,
      y: 57.5,
    },
    {
      id: 'attention-queue',
      body: 'Due earlier, ready-to-turn-in work, quizzes, and tests stay surfaced automatically.',
      label: 'Attention queue',
      x: 60.1,
      y: 48.8,
    },
  ],
  video: {
    desktop: '/assets/video/diana-coach-story-desktop-1600x900.mp4',
    mobile: '/assets/video/diana-coach-story-mobile-720x720.mp4',
    poster: '/assets/video/diana-coach-story-poster-desktop-1600x900.webp',
    mobilePoster: '/assets/video/diana-coach-story-poster-mobile-720x720.webp',
    candidateDesktop: '/assets/video/diana-first-line-girl-desktop-1920x1080.mp4',
    candidateMobile: '/assets/video/diana-first-line-girl-mobile-720x720.mp4',
    candidatePoster: '/assets/video/diana-first-line-girl-poster-desktop-1600x900.webp',
    candidateMobilePoster: '/assets/video/diana-first-line-girl-poster-mobile-720x720.webp',
  },
}

export const tonightScenario = {
  id: 'how-it-works',
  legacyId: 'tonight-example',
  headline: 'Your Homework Workspace',
  intro: 'Open the assignment, see what is next, and work through it without losing your place.',
  dashboard: {
    caption: "ONE STUDENT'S DIANA",
    desktop: {
      alt: 'Diana Today dashboard showing a high school student, the next English task, check-in, and assignments needing attention.',
      height: 778,
      src: '/assets/dashboard/diana-dashboard-school-1472x778.webp',
      width: 1472,
    },
    mobile: [
      {
        alt: 'Diana Today dashboard showing English 9 as the next move with an estimated 35 minutes.',
        height: 778,
        id: 'dashboard-next-move',
        label: 'NEXT MOVE',
        src: '/assets/dashboard/diana-dashboard-school-1472x778.webp',
        summary: 'English 9 · est. 35 min',
        width: 1472,
      },
      {
        alt: 'Diana Today dashboard showing a student and their high school campus.',
        height: 778,
        id: 'school-day',
        label: 'YOUR DAY',
        src: '/assets/dashboard/diana-dashboard-school-1472x778.webp',
        summary: 'Schoolwork in one view',
        width: 1472,
      },
      {
        alt: 'Diana Today dashboard showing assignments that need attention.',
        height: 778,
        id: 'needs-attention',
        label: 'NEEDS ATTENTION',
        src: '/assets/dashboard/diana-dashboard-school-1472x778.webp',
        summary: '2 due earlier · 0 missing',
        width: 1472,
      },
    ],
  },
  example: {
    id: 'tonight-english-example',
    label: 'Illustrative product scenario',
    studentState: 'Low energy',
    assignments: [
      { subject: 'English', detail: 'Personal narrative', state: 'Half finished' },
      { subject: 'Biology', detail: 'Lab questions', state: 'Thursday' },
      { subject: 'History', detail: 'Source notes', state: 'Friday' },
    ],
    nextMove: 'Open your English draft. Read the last paragraph.',
    studentWords: 'I stopped waiting to feel ready.',
    dianaQuestion: 'What changed?',
    studentRevision: 'I walked into practice before I felt ready.',
    submissionStatus: 'Draft updated. Not submitted.',
    meta: illustrative('Illustrative product scenario'),
  },
  meta: verified([
    'Energy-aware assignment ranking',
    'Source-anchored help',
    'Explicit submission confirmation',
  ]),
}

export const transformations = {
  id: 'how-diana-helps',
  eyebrow: '',
  headline: 'Choose Your Help Mode',
  body: '',
  items: [
    {
      id: 'help-decode',
      title: 'Decode The Ask',
      body: 'Turn messy directions into a checklist.',
      image: {
        src: '/assets/help-fit/decode-the-ask.webp',
        alt: 'White male student marking a checklist beside a tablet in a bright school commons.',
      },
      accent: '#3ee1ed',
      accentRgb: '62, 225, 237',
      meta: verified(['Rubric interpretation', 'Assignment direction parsing']),
    },
    {
      id: 'help-sources',
      title: 'Use Your Sources',
      body: 'Bring in the notes your teacher actually gave you.',
      image: {
        src: '/assets/help-fit/use-your-sources.webp',
        alt: 'Hispanic female student comparing class notes, source pages, and a tablet in a school library.',
      },
      accent: '#78a4ff',
      accentRgb: '120, 164, 255',
      meta: verified(['Source-anchored help', 'Course and task context']),
    },
    {
      id: 'help-practice',
      title: 'Practice Safely',
      body: 'Try a nearby example before your real one.',
      image: {
        src: '/assets/help-fit/practice-safely.webp',
        alt: 'Asian male student working on a tablet beside abstract math and science diagrams.',
      },
      accent: '#d04696',
      accentRgb: '208, 70, 150',
      meta: verified(['Socratic guard', 'Practice workflow']),
    },
    {
      id: 'help-rubric',
      title: 'Check The Rubric',
      body: 'Catch missing pieces before turn-in.',
      image: {
        src: '/assets/help-fit/check-against-rubric.webp',
        alt: 'Black female student reviewing a draft and checklist at a modern study table.',
      },
      accent: '#62e6a7',
      accentRgb: '98, 230, 167',
      meta: verified(['Assignment review', 'Explicit submission confirmation']),
    },
    {
      id: 'help-time',
      title: 'Plan Your Time',
      body: 'Know what fits tonight before you start.',
      image: {
        src: '/assets/help-fit/plan-your-time.webp',
        alt: 'White female student planning homework time with a paper planner and tablet calendar.',
      },
      accent: '#3159ad',
      accentRgb: '49, 89, 173',
      meta: verified(['Time calibration', 'Energy-aware assignment ranking']),
    },
  ],
  timeExample: {
    id: 'time-calibration-example',
    label: 'Illustrative example',
    teacherEstimate: '30 min',
    latestActual: '64 min',
    dianaHint: 'About 64 min for you',
    meta: illustrative('Illustrative example'),
  },
}

export const systemProof = {
  id: 'your-control',
  headline: 'Your Work Stays Yours',
  body: 'Diana guides. You write. You decide when it is ready.',
  visual: {
    desktopSrc: '/assets/video/diana-work-stays-yours-overlay-desktop-v15.webm',
    mobileSrc: '/assets/video/diana-work-stays-yours-overlay-mobile-v15.webm',
    poster: '/assets/video/diana-work-stays-yours-overlay-poster-desktop-v15.webp',
    mobilePoster: '/assets/video/diana-work-stays-yours-overlay-poster-mobile-v15.webp',
    endAt: 20.2,
    alt: 'Two real student writing moments lead into separate Diana guidance and student work areas, a visible student revision, and a student-controlled Turn In decision.',
    description: 'A 21-second film moves through four clear statements: Diana Guides, You Write, You Decide, and Yours. Diana asks a guiding question, students do the writing and revision, and only the student chooses when to turn in the finished work.',
  },
  beats: [
    {
      id: 'control-help',
      label: 'Guided Help',
      body: 'One clear next step when a problem stops you.',
    },
    {
      id: 'control-own',
      label: 'Your Answer',
      body: 'Diana keeps its coaching separate from what you write.',
    },
    {
      id: 'control-confirm',
      label: 'Your Choice',
      body: 'You decide when your work is ready to turn in.',
    },
  ],
  items: [
    {
      id: 'proof-ownership',
      title: 'Help, not ghostwriting',
      body: 'Diana coaches the step you are on. The answer stays yours.',
      image: {
        src: '/assets/homework/diana-homework-workspace-demo-poster.jpg',
        alt: 'Diana homework workspace on a phone held by a student.',
      },
      proof: ['Final answer stays yours'],
      meta: verified(['Final-answer and ghostwriting safeguards']),
    },
    {
      id: 'proof-receipt',
      title: 'A trail you can explain',
      body: 'Hints, sources, and edits stay separate from your draft.',
      proof: ['Guidance stays separate'],
      meta: verified(['Authorship log', 'Source-anchored help']),
    },
    {
      id: 'proof-sharing',
      title: 'Private until you share',
      body: 'Sharing starts off. You decide when someone else sees it.',
      proof: ['Private until you share'],
      meta: verified(['Expiring share links', 'Revocation', 'Restricted parent summary']),
    },
    {
      id: 'proof-submission',
      title: 'Submit takes confirmation',
      body: 'Turn-in always asks you first.',
      proof: ['Confirmation required'],
      meta: verified(['Explicit submission confirmation']),
    },
  ],
}

export const finalCta = {
  id: 'create-your-diana',
  eyebrow: 'LAUNCHING NOVEMBER 1',
  headline: 'BE FIRST IN',
  primaryCta: {
    id: 'final-create-account',
    kind: 'primary',
    label: 'GET EARLY ACCESS',
    href: '/signup',
  },
  meta: verified(['November 1 launch date']),
}
