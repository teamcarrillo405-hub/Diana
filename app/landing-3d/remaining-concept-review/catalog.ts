export const families = [
  { id: "classes", label: "Classes", screens: ["class-detail", "class-policy"] },
  { id: "study", label: "Study", screens: ["study", "study-library", "study-new", "study-guide", "study-quiz", "study-results"] },
  { id: "library", label: "Library", screens: ["notes", "notes-new", "notes-detail", "search"] },
  { id: "record", label: "Record", screens: ["proof", "wellness", "sharing", "share-parent", "share-portfolio", "share-unavailable"] },
  { id: "entry", label: "Entry", screens: ["login", "signup", "onboarding"] },
  { id: "public", label: "Public", screens: ["public-home", "trust", "student-control", "early-confirm", "early-unsubscribe", "policy"] },
  { id: "recovery", label: "Recovery", screens: ["loading", "error", "not-found", "offline"] },
] as const;

export const screenInfo = {
  "class-detail": { label: "Class profile", path: "/classes/[id]", kicker: "CLASS / BIOLOGY", title: "Biology", note: "Current work, course materials, and teacher context." },
  "class-policy": { label: "Help rules", path: "/classes/[id]/settings", kicker: "CLASS / HELP RULES", title: "How Diana can help", note: "The teacher's AI policy stays explicit for this class." },
  study: { label: "Choose work", path: "/study", kicker: "STUDY / SELECT", title: "Choose what to practice", note: "Pick an assignment. The next step uses its actual source and help rules." },
  "study-library": { label: "Saved", path: "/study-artifacts", kicker: "STUDY / LIBRARY", title: "Saved practice", note: "Guides and quizzes stay tied to their source." },
  "study-new": { label: "Create quiz", path: "/study-artifacts/new", kicker: "STUDY / BRIEFING", title: "Create a quiz", note: "Choose a source and question count before generating." },
  "study-guide": { label: "Study guide", path: "/study-artifacts/[id]", kicker: "STUDY / GUIDE", title: "Study guide", note: "A quiet reading view with source context." },
  "study-quiz": { label: "Quiz", path: "/study-artifacts/[id]", kicker: "STUDY / QUIZ", title: "Cell structure quiz", note: "One question at a time, with an explicit save." },
  "study-results": { label: "Results", path: "/study-artifacts/[id]", kicker: "STUDY / REVIEW", title: "Review this pass", note: "See recorded answers and the limits of automatic checking." },
  notes: { label: "Notes library", path: "/notes", kicker: "NOTES / LIBRARY", title: "Your notes", note: "Find a source before opening or creating a note." },
  "notes-new": { label: "Capture note", path: "/notes/new", kicker: "NOTES / CAPTURE", title: "New note", note: "Write, record, or add a source document." },
  "notes-detail": { label: "Note editor", path: "/notes/[id]", kicker: "NOTES / EDIT", title: "Cell observations", note: "Your writing stays central; help and source details stay nearby." },
  search: { label: "Search", path: "/search", kicker: "LIBRARY / SEARCH", title: "Search Diana", note: "Search work, notes, classes, concepts, and saved materials." },
  proof: { label: "Record", path: "/proof", kicker: "RECORD / EVIDENCE", title: "Your record", note: "Completed work and saved artifacts, without invented achievements." },
  wellness: { label: "Wellness history", path: "/wellness", kicker: "WELLNESS / HISTORY", title: "Check-in history", note: "A private view of what you chose to record." },
  sharing: { label: "Sharing settings", path: "/sharing", kicker: "SHARING / PERMISSION", title: "Parent digest", note: "Choose whether a parent receives the digest." },
  "share-parent": { label: "Parent report", path: "/share/[token]", kicker: "SHARED REPORT / PARENT", title: "Parent report", note: "A read-only example of the recipient view." },
  "share-portfolio": { label: "Portfolio share", path: "/share/[token]", kicker: "SHARED REPORT / EVIDENCE", title: "Selected work", note: "A read-only example of work and reflection shared with a viewer." },
  "share-unavailable": { label: "Unavailable share", path: "/share/[token]", kicker: "SHARED REPORT", title: "Link unavailable", note: "A shared report can only be viewed while its link is available." },
  login: { label: "Sign in", path: "/login", kicker: "DIANA / ACCOUNT", title: "Sign in", note: "Enter your account to reach Diana." },
  signup: { label: "Create account", path: "/signup", kicker: "DIANA / ACCOUNT", title: "Create your account", note: "Account creation is separate from the early access list." },
  onboarding: { label: "Set up Diana", path: "/onboarding", kicker: "DIANA / SETUP", title: "Make Diana yours", note: "One focused setup flow; school connection is optional." },
  "public-home": { label: "Home", path: "/", kicker: "DIANA / HOME", title: "Your day, sorted", note: "Organize real work, get guidance, and decide when it is ready." },
  trust: { label: "Trust", path: "/trust", kicker: "DIANA / TRUST", title: "Built around your control", note: "A summary of privacy and student choice, with the full notices nearby." },
  "student-control": { label: "Student control", path: "/student-control", kicker: "DIANA / HOW IT WORKS", title: "You do the work", note: "Diana guides. You write. You decide when to turn it in." },
  "early-confirm": { label: "Confirm email", path: "/early-access/confirm", kicker: "EARLY ACCESS / CONFIRM", title: "Confirm your email", note: "Confirmation is for the waitlist, not an account unlock." },
  "early-unsubscribe": { label: "Leave list", path: "/early-access/unsubscribe", kicker: "EARLY ACCESS / PREFERENCES", title: "Email preferences", note: "A quiet confirmation for removing an address from the list." },
  policy: { label: "Policy reader", path: "/privacy.html and /terms.html", kicker: "DIANA / POLICY", title: "Policy reader", note: "Readable policy text stays in document order." },
  loading: { label: "Loading", path: "shared loading.tsx", kicker: "DIANA / LOADING", title: "Getting your space ready", note: "Stable layout while a page loads." },
  error: { label: "Error", path: "shared error.tsx", kicker: "DIANA / RECOVERY", title: "This page needs another try", note: "A retry cannot promise that an unsaved draft was kept." },
  "not-found": { label: "Not found", path: "shared not-found.tsx", kicker: "DIANA / RECOVERY", title: "Page not found", note: "Choose a known destination." },
  offline: { label: "Offline", path: "/offline", kicker: "DIANA / CONNECTION", title: "You are offline", note: "Connection status and saved-work status are separate." },
} as const;

export type Screen = keyof typeof screenInfo;
export function isScreen(value: string): value is Screen { return value in screenInfo; }
export const reviewHref = (screen: Screen) => `/landing-3d/remaining-concept-review/${screen}`;
