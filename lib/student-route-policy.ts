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
  "/upgrade",
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
