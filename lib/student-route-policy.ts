/**
 * Student-facing routes that have been folded into a single current surface.
 *
 * Keep this list at the routing boundary rather than leaving old screens
 * reachable behind stale links. Their server actions and data adapters remain
 * available to the canonical surface until they are deliberately retired.
 */
const RETIRED_EXACT_ROUTES = new Set([
  "/assignments/new",
  "/templates",
  "/voice",
  "/body-double",
  "/break-down",
  "/ap",
  "/timer",
  "/study-buddy",
  "/study-groups",
  "/parent-share",
  "/teacher-share",
  "/settings/goals",
  "/settings/ai-history",
  "/settings/tutor",
  "/landing-editor-preview",
  "/grades",
  "/grades/transcript",
  "/export",
  "/notifications",
  "/knowledge-graph",
]);

const RETIRED_PREFIXES = [
  "/inbox",
  "/course-mode",
  "/portfolio",
  "/flashcards",
  "/concepts",
  "/insights",
  "/design",
  "/qa/smart-loading-probe",
] as const;

export function isRetiredStudentRoute(pathname: string): boolean {
  const route = pathname.replace(/\/+$/u, "") || "/";
  if (RETIRED_EXACT_ROUTES.has(route)) return true;

  return RETIRED_PREFIXES.some(
    (prefix) => route === prefix || route.startsWith(`${prefix}/`),
  );
}

export const CANONICAL_STUDENT_DESTINATIONS = Object.freeze({
  addAssignment: "/quick-add",
  assignmentCapture: "/assignments/captures",
  notes: "/notes",
  study: "/study",
  record: "/proof",
  sharing: "/sharing",
  settings: "/settings",
} as const);

/** Resolve old entry points before the retirement boundary. Destinations are local and fixed. */
export function currentStudentDestination(pathname: string): string | null {
  const route = pathname.replace(/\/+$/u, "") || "/";
  const exact: Readonly<Record<string,string>> = {
    "/assignments/new":"/quick-add", "/templates":"/quick-add", "/voice":"/notes/new?mode=voice",
    "/body-double":"/dashboard", "/break-down":"/assignments", "/ap":"/study", "/timer":"/dashboard",
    "/study-buddy":"/assignments", "/study-groups":"/study", "/parent-share":"/sharing", "/teacher-share":"/sharing",
    "/settings/goals":"/settings?section=goals", "/settings/ai-history":"/settings?section=ai#ai-history-export",
    "/settings/tutor":"/settings?section=tutor", "/grades":"/proof", "/grades/transcript":"/proof",
    "/export":"/settings?section=ai#ai-history-export", "/notifications":"/calendar",
    "/knowledge-graph":"/study", "/inbox":"/assignments/captures", "/course-mode":"/classes",
    "/landing-3d/today-now-assets":"/dashboard", "/landing-3d/today-now-composition":"/dashboard",
    "/landing-3d/today-preview":"/dashboard", "/landing-3d/settings-concept-review":"/settings",
    "/landing-3d/submission-concept-review":"/assignments?view=ready", "/landing-3d/remaining-concept-review":"/more",
    "/landing-3d/onboarding-preview":"/onboarding",
  };
  if (exact[route]) return exact[route];
  const capture = route.match(/^\/inbox\/([^/]+)$/u);
  if (capture) return `/assignments/captures/${capture[1]}`;
  const course = route.match(/^\/course-mode\/courses\/([^/]+)$/u);
  if (course) return "/classes";
  if (/^\/course-mode(?:\/|$)/u.test(route)) return "/classes";
  if (/^\/(?:portfolio|insights)(?:\/|$)/u.test(route)) return "/proof";
  if (/^\/flashcards(?:\/|$)/u.test(route)) return "/study/recall";
  if (/^\/concepts(?:\/|$)/u.test(route)) return "/study";
  const preview = route.match(/^\/landing-3d\/remaining-concept-review\/([^/]+)$/u);
  if (preview) {
    const screens: Readonly<Record<string,string>> = {
      "class-detail":"/classes", "class-policy":"/classes", study:"/study", "study-library":"/study?view=saved",
      "study-new":"/study", "study-guide":"/study?view=saved", "study-quiz":"/study?view=saved", "study-results":"/study?view=saved", "study-flashcards":"/study/recall",
      notes:"/notes", "notes-new":"/notes/new", "notes-detail":"/notes", search:"/search", proof:"/proof", wellness:"/wellness", sharing:"/sharing",
      "share-parent":"/sharing", "share-portfolio":"/sharing", "share-unavailable":"/sharing", login:"/login", signup:"/signup", onboarding:"/onboarding",
      "public-home":"/", trust:"/trust", "student-control":"/student-control", "early-confirm":"/early-access/confirm", "early-unsubscribe":"/early-access/unsubscribe", policy:"/privacy.html",
      loading:"/dashboard", error:"/dashboard", "not-found":"/dashboard", offline:"/offline",
    };
    return screens[preview[1]] ?? null;
  }
  return null;
}
