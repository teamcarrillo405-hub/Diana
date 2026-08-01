import type { LandingNodeId, LandingPageConfig } from "./config";

export type LandingConfigPath = readonly (string | number)[];

export interface LandingEditorField {
  label: string;
  path: LandingConfigPath;
  multiline?: boolean;
}

export interface LandingEditorNodeDefinition {
  id: LandingNodeId;
  label: string;
  section: string;
  fields: readonly LandingEditorField[];
  imagePath?: LandingConfigPath;
  movable?: boolean;
  resizable?: boolean;
}

const node = (
  definition: LandingEditorNodeDefinition,
): LandingEditorNodeDefinition => definition;

export const LANDING_EDITOR_NODES: readonly LandingEditorNodeDefinition[] = [
  node({
    id: "hero.background",
    label: "Hero background",
    section: "Welcome",
    fields: [],
    imagePath: ["onboarding", "hero", "backgroundUrl"],
    movable: false,
    resizable: false,
  }),
  node({ id: "hero.logo", label: "Diana logo", section: "Welcome", fields: [] }),
  node({
    id: "hero.title",
    label: "Hero title",
    section: "Welcome",
    fields: [
      { label: "Title", path: ["onboarding", "hero", "title"] },
      {
        label: "Accent title",
        path: ["onboarding", "hero", "accentTitle"],
      },
    ],
  }),
  node({
    id: "hero.subtitle",
    label: "Hero subtitle",
    section: "Welcome",
    fields: [
      {
        label: "Subtitle",
        path: ["onboarding", "hero", "subtitle"],
        multiline: true,
      },
    ],
  }),
  node({
    id: "hero.cta",
    label: "Get started button",
    section: "Welcome",
    fields: [{ label: "Label", path: ["onboarding", "hero", "cta"] }],
  }),
  node({ id: "education.logo", label: "Diana logo", section: "Education", fields: [] }),
  node({
    id: "education.heading",
    label: "Education heading",
    section: "Education",
    fields: [
      {
        label: "Eyebrow",
        path: ["onboarding", "education", "eyebrow"],
      },
      { label: "Heading", path: ["onboarding", "education", "title"] },
    ],
  }),
  node({
    id: "education.stat",
    label: "GPA statistic",
    section: "Education",
    fields: [
      {
        label: "Value",
        path: ["onboarding", "education", "statValue"],
      },
      {
        label: "Opening",
        path: ["onboarding", "education", "statPrefix"],
      },
      {
        label: "Brand",
        path: ["onboarding", "education", "statBrand"],
      },
      {
        label: "Middle",
        path: ["onboarding", "education", "statMiddle"],
      },
      {
        label: "Result",
        path: ["onboarding", "education", "statResult"],
        multiline: true,
      },
    ],
  }),
  node({
    id: "education.benefit.time",
    label: "Time-saving benefit",
    section: "Education",
    fields: [
      {
        label: "Title",
        path: ["onboarding", "education", "benefits", 0, "title"],
      },
      {
        label: "Body",
        path: ["onboarding", "education", "benefits", 0, "body"],
        multiline: true,
      },
    ],
  }),
  node({
    id: "education.benefit.precision",
    label: "Precision benefit",
    section: "Education",
    fields: [
      {
        label: "Title",
        path: ["onboarding", "education", "benefits", 1, "title"],
      },
      {
        label: "Body",
        path: ["onboarding", "education", "benefits", 1, "body"],
        multiline: true,
      },
    ],
  }),
  node({
    id: "education.cta",
    label: "Education button",
    section: "Education",
    fields: [{ label: "Label", path: ["onboarding", "education", "cta"] }],
  }),
  node({ id: "challenge.logo", label: "Diana logo", section: "Challenge", fields: [] }),
  node({
    id: "challenge.heading",
    label: "Challenge heading",
    section: "Challenge",
    fields: [
      {
        label: "Heading",
        path: ["onboarding", "challenge", "title"],
        multiline: true,
      },
    ],
  }),
  ...(
    [
      ["time_management", "Time management", 0],
      ["exam_stress", "Exam stress", 1],
      ["complex_concepts", "Complex concepts", 2],
      ["staying_consistent", "Staying consistent", 3],
    ] as const
  ).map(([id, label, index]) =>
    node({
      id: `challenge.option.${id}`,
      label,
      section: "Challenge",
      fields: [
        {
          label: "Label",
          path: ["onboarding", "challenge", "options", index, "label"],
        },
        {
          label: "Description",
          path: ["onboarding", "challenge", "options", index, "description"],
          multiline: true,
        },
      ],
    }),
  ),
  node({
    id: "challenge.cta",
    label: "Challenge button",
    section: "Challenge",
    fields: [{ label: "Label", path: ["onboarding", "challenge", "cta"] }],
  }),
  node({ id: "schedule.logo", label: "Diana logo", section: "Schedule", fields: [] }),
  node({
    id: "schedule.heading",
    label: "Schedule heading",
    section: "Schedule",
    fields: [
      {
        label: "Heading",
        path: ["onboarding", "schedule", "title"],
        multiline: true,
      },
    ],
  }),
  ...(
    [
      ["morning", "Morning option", 0],
      ["after_practice", "After-practice option", 1],
      ["late_night", "Late-night option", 2],
    ] as const
  ).map(([id, label, index]) =>
    node({
      id: `schedule.option.${id}`,
      label,
      section: "Schedule",
      fields: [
        {
          label: "Label",
          path: ["onboarding", "schedule", "options", index, "label"],
        },
        {
          label: "Description",
          path: ["onboarding", "schedule", "options", index, "description"],
          multiline: true,
        },
      ],
    }),
  ),
  node({
    id: "schedule.cta",
    label: "Schedule button",
    section: "Schedule",
    fields: [{ label: "Label", path: ["onboarding", "schedule", "cta"] }],
  }),
  node({ id: "community.logo", label: "Diana logo", section: "Community", fields: [] }),
  node({
    id: "community.heading",
    label: "Community heading",
    section: "Community",
    fields: [
      { label: "Title", path: ["community", "title"] },
      { label: "Accent title", path: ["community", "accentTitle"] },
      {
        label: "Subtitle",
        path: ["community", "subtitle"],
        multiline: true,
      },
    ],
  }),
  node({
    id: "community.proof",
    label: "Privacy promise",
    section: "Community",
    fields: [
      {
        label: "Promise",
        path: ["community", "proof"],
        multiline: true,
      },
      { label: "Proof title", path: ["community", "proofTitle"] },
      {
        label: "Proof subtitle",
        path: ["community", "proofSubtitle"],
      },
    ],
  }),
  ...(
    [
      ["members", "Member fact", 0],
      ["privacy", "Privacy fact", 1],
    ] as const
  ).map(([id, label, index]) =>
    node({
      id: `community.fact.${id}`,
      label,
      section: "Community",
      fields: [
        { label: "Value", path: ["community", "facts", index, "value"] },
        { label: "Label", path: ["community", "facts", index, "label"] },
      ],
    }),
  ),
  node({
    id: "community.plan",
    label: "Community access",
    section: "Community",
    fields: [
      { label: "Label", path: ["community", "planLabel"] },
      { label: "Title", path: ["community", "planTitle"] },
      {
        label: "Body",
        path: ["community", "planBody"],
        multiline: true,
      },
    ],
  }),
  node({
    id: "community.cta",
    label: "Community button",
    section: "Community",
    fields: [
      { label: "Label", path: ["community", "cta"] },
      {
        label: "Footer",
        path: ["community", "footer"],
        multiline: true,
      },
    ],
  }),
  node({ id: "standard.logo", label: "Diana logo", section: "Account", fields: [] }),
  node({
    id: "standard.heading",
    label: "Account heading",
    section: "Account",
    fields: [
      { label: "Eyebrow", path: ["standard", "kicker"] },
      { label: "Title", path: ["standard", "title"] },
      { label: "Accent title", path: ["standard", "accentTitle"] },
    ],
  }),
  ...(
    [
      ["guided", "Guided tools", 0],
      ["learning", "Learning tools", 1],
      ["progress", "Private progress", 2],
    ] as const
  ).map(([id, label, index]) =>
    node({
      id: `standard.benefit.${id}`,
      label,
      section: "Account",
      fields: [
        { label: "Title", path: ["standard", "benefits", index, "title"] },
        {
          label: "Body",
          path: ["standard", "benefits", index, "body"],
          multiline: true,
        },
      ],
    }),
  ),
  node({
    id: "standard.access",
    label: "Diana access option",
    section: "Account",
    fields: [
      { label: "Title", path: ["standard", "accessTitle"] },
      {
        label: "Body",
        path: ["standard", "accessBody"],
        multiline: true,
      },
    ],
  }),
  node({
    id: "standard.controls",
    label: "Account controls",
    section: "Account",
    fields: [
      { label: "Title", path: ["standard", "controlsTitle"] },
      {
        label: "Body",
        path: ["standard", "controlsBody"],
        multiline: true,
      },
    ],
  }),
  node({
    id: "standard.cta",
    label: "Create account button",
    section: "Account",
    fields: [
      { label: "Label", path: ["standard", "cta"] },
      {
        label: "Footer",
        path: ["standard", "footer"],
        multiline: true,
      },
    ],
  }),
];

export const LANDING_EDITOR_NODE_MAP = new Map(
  LANDING_EDITOR_NODES.map((definition) => [definition.id, definition]),
);

export function readLandingConfigValue(
  config: LandingPageConfig,
  path: LandingConfigPath,
): string {
  let current: unknown = config;
  for (const segment of path) {
    if (typeof current !== "object" || current === null) return "";
    current = (current as Record<string | number, unknown>)[segment];
  }
  return typeof current === "string" ? current : "";
}

export function writeLandingConfigValue(
  config: LandingPageConfig,
  path: LandingConfigPath,
  value: string,
): LandingPageConfig {
  const next = structuredClone(config) as unknown as Record<
    string | number,
    unknown
  >;
  let current = next;
  for (let index = 0; index < path.length - 1; index += 1) {
    current = current[path[index]!] as Record<string | number, unknown>;
  }
  current[path.at(-1)!] = value;
  return next as unknown as LandingPageConfig;
}
