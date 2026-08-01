export type ComparisonPage = {
  readonly id: string;
  readonly label: string;
  readonly group: "Primary" | "Work flow";
  readonly liveRoute: `/${string}`;
  readonly desktopDesign?: `/design/${string}.dc.html`;
  readonly mobileDesign?: `/design/${string}.dc.html`;
};

export const COMPARISON_PAGES: readonly ComparisonPage[] = Object.freeze([
  {
    id: "today",
    label: "Today",
    group: "Primary",
    liveRoute: "/dashboard",
    desktopDesign: "/design/Student Lobby.dc.html",
    mobileDesign: "/design/Student Lobby Phone.dc.html",
  },
  {
    id: "work",
    label: "Work",
    group: "Primary",
    liveRoute: "/assignments",
    desktopDesign: "/design/Work.dc.html",
    mobileDesign: "/design/Work Phone.dc.html",
  },
  {
    id: "classes",
    label: "Classes",
    group: "Primary",
    liveRoute: "/classes",
    desktopDesign: "/design/Classes.dc.html",
    mobileDesign: "/design/Classes Phone.dc.html",
  },
  {
    id: "calendar",
    label: "Calendar",
    group: "Primary",
    liveRoute: "/calendar",
    desktopDesign: "/design/Calendar.dc.html",
    mobileDesign: "/design/Calendar Phone.dc.html",
  },
  {
    id: "search",
    label: "Search",
    group: "Primary",
    liveRoute: "/search",
    desktopDesign: "/design/Search.dc.html",
  },
  {
    id: "proof",
    label: "Record",
    group: "Primary",
    liveRoute: "/proof",
    desktopDesign: "/design/Proof.dc.html",
    mobileDesign: "/design/Proof Phone.dc.html",
  },
  {
    id: "wellness",
    label: "Wellness",
    group: "Primary",
    liveRoute: "/wellness",
    desktopDesign: "/design/Wellness.dc.html",
    mobileDesign: "/design/Wellness Phone.dc.html",
  },
  {
    id: "sharing",
    label: "Sharing",
    group: "Primary",
    liveRoute: "/sharing",
    desktopDesign: "/design/Sharing.dc.html",
    mobileDesign: "/design/Sharing Phone.dc.html",
  },
  {
    id: "settings",
    label: "Settings",
    group: "Primary",
    liveRoute: "/settings",
    desktopDesign: "/design/Settings.dc.html",
    mobileDesign: "/design/Settings Phone.dc.html",
  },
  {
    id: "more",
    label: "More",
    group: "Primary",
    liveRoute: "/more",
    desktopDesign: "/design/More.dc.html",
    mobileDesign: "/design/More Phone.dc.html",
  },
  {
    id: "assignment",
    label: "Assignment Workspace",
    group: "Work flow",
    liveRoute: "/design/work-flow/workspace",
    desktopDesign: "/design/Assignment.dc.html",
    mobileDesign: "/design/Assignment Phone.dc.html",
  },
  {
    id: "submission",
    label: "Submission Review",
    group: "Work flow",
    liveRoute: "/design/work-flow/submission",
  },
  {
    id: "capture",
    label: "Capture",
    group: "Work flow",
    liveRoute: "/quick-add",
    desktopDesign: "/design/Quick Add.dc.html",
  },
  {
    id: "voice",
    label: "Voice Note",
    group: "Work flow",
    liveRoute: "/voice",
  },
]);

export function findComparisonPage(id: string | null | undefined) {
  return (
    COMPARISON_PAGES.find((page) => page.id === id) ?? COMPARISON_PAGES[0]
  );
}

export function comparisonFrameUrl(
  page: ComparisonPage,
  viewport: "desktop" | "mobile",
  source: "live" | "design",
) {
  if (source === "live") return page.liveRoute;
  if (viewport === "desktop") return page.desktopDesign ?? page.liveRoute;
  return page.mobileDesign ?? page.liveRoute;
}
