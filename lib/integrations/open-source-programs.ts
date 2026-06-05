export type OpenSourceProgramId = "openjarvis" | "leantime" | "nextcloud" | "languagetool";

export type OpenSourceProgramMap = {
  id: OpenSourceProgramId;
  name: string;
  localPath: string;
  license: "Apache-2.0" | "AGPL-3.0-or-later" | "LGPL-2.1-or-later";
  usefulPatterns: string[];
  dianaUse: string[];
  integrationBoundary: string;
  studentBenefit: string;
};

export const OPEN_SOURCE_PROGRAMS: OpenSourceProgramMap[] = [
  {
    id: "openjarvis",
    name: "OpenJarvis",
    localPath: "vendor/open-source/OpenJarvis",
    license: "Apache-2.0",
    usefulPatterns: [
      "local-first personal AI posture",
      "agent presets for scheduled digest and simple chat",
      "skills catalog and tool-selection architecture",
      "spoken daily briefing pattern",
    ],
    dianaUse: [
      "keep Diana voice manual and visible rather than wake-word standby",
      "model future local-first voice commands as a command registry",
      "add daily academic briefing as a student-owned recap pattern",
      "treat latency and privacy as first-class student UX constraints",
    ],
    integrationBoundary:
      "Do not embed the Python/Rust agent runtime in the Next app. Reuse concepts and optionally call a separately installed local OpenJarvis process later.",
    studentBenefit:
      "Voice and future-mode controls can feel more personal while staying private, visible, and under the student's control.",
  },
  {
    id: "leantime",
    name: "Leantime",
    localPath: "vendor/open-source/leantime",
    license: "AGPL-3.0-or-later",
    usefulPatterns: [
      "my-work dashboard for non-project managers",
      "milestones, goals, and idea boards",
      "ADHD, dyslexia, and autism-aware project-management positioning",
      "kanban, calendar, and time-tracking views",
    ],
    dianaUse: [
      "translate project milestones into class assignment milestones",
      "keep focus queue and recap as a student my-work dashboard",
      "use idea-board thinking for notes-to-assignment capture",
      "use gentle time tracking without productivity pressure",
    ],
    integrationBoundary:
      "Do not copy AGPL PHP code into Diana. Reuse workflow concepts and build Diana-native TypeScript surfaces.",
    studentBenefit:
      "Large school projects become visible milestones and one-move actions instead of an overwhelming project-management system.",
  },
  {
    id: "nextcloud",
    name: "Nextcloud Server",
    localPath: "vendor/open-source/nextcloud-server",
    license: "AGPL-3.0-or-later",
    usefulPatterns: [
      "self-hosted file, calendar, and sharing model",
      "WebDAV/CalDAV style sync posture",
      "source ownership and privacy-first storage",
      "share links with explicit permissions",
    ],
    dianaUse: [
      "treat uploaded notes, rubrics, and source files as a student source vault",
      "map future storage connectors through explicit source anchors",
      "keep teacher/parent sharing permissioned and narrow",
      "support calendar import/export without locking students into one school system",
    ],
    integrationBoundary:
      "Do not bundle the AGPL PHP server. Add optional connector documentation and keep Diana storage in Supabase unless a school deploys Nextcloud separately.",
    studentBenefit:
      "Students keep control of class sources while Diana can cite exactly where a hint, card, or checklist came from.",
  },
  {
    id: "languagetool",
    name: "LanguageTool",
    localPath: "vendor/open-source/languagetool",
    license: "LGPL-2.1-or-later",
    usefulPatterns: [
      "open proofreading server",
      "multilingual grammar and spelling checks",
      "HTTP API that can run locally",
      "rule-based feedback separate from authorship-heavy AI generation",
    ],
    dianaUse: [
      "add a grammar check that preserves authorship by marking review suggestions without rewriting final work",
      "support dyslexia-friendly proofreading with small batches",
      "keep language feedback source-anchored to the student's own draft",
      "use local LanguageTool when LANGUAGETOOL_URL is configured",
    ],
    integrationBoundary:
      "Use a service boundary to a separately running LanguageTool server. Do not compile the Java project into Diana.",
    studentBenefit:
      "Writing help can catch mechanics while preserving student authorship and avoiding AI takeover.",
  },
];

export function openSourceProgram(id: OpenSourceProgramId): OpenSourceProgramMap {
  return OPEN_SOURCE_PROGRAMS.find((program) => program.id === id) ?? OPEN_SOURCE_PROGRAMS[0];
}

export function openSourceGapCoverage() {
  return {
    voiceAndLocalControl: openSourceProgram("openjarvis").dianaUse,
    adhdDyslexiaPlanning: openSourceProgram("leantime").dianaUse,
    studentSourceVault: openSourceProgram("nextcloud").dianaUse,
    writingMechanics: openSourceProgram("languagetool").dianaUse,
  };
}
