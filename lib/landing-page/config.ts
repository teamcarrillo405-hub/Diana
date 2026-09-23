import { z } from "zod";

export const LANDING_PAGE_SLUG = "public-home";

export const LANDING_NODE_IDS = [
  "hero.background",
  "hero.logo",
  "hero.title",
  "hero.subtitle",
  "hero.cta",
  "education.logo",
  "education.heading",
  "education.stat",
  "education.benefit.time",
  "education.benefit.precision",
  "education.cta",
  "challenge.logo",
  "challenge.heading",
  "challenge.option.time_management",
  "challenge.option.exam_stress",
  "challenge.option.complex_concepts",
  "challenge.option.staying_consistent",
  "challenge.cta",
  "schedule.logo",
  "schedule.heading",
  "schedule.option.morning",
  "schedule.option.after_practice",
  "schedule.option.late_night",
  "schedule.cta",
  "community.logo",
  "community.heading",
  "community.proof",
  "community.fact.members",
  "community.fact.privacy",
  "community.plan",
  "community.cta",
  "standard.logo",
  "standard.heading",
  "standard.benefit.guided",
  "standard.benefit.learning",
  "standard.benefit.progress",
  "standard.access",
  "standard.controls",
  "standard.cta",
] as const;

export type LandingNodeId = (typeof LANDING_NODE_IDS)[number];
export type LandingBreakpoint = "desktop" | "mobile";

const shortText = z.string().trim().min(1).max(120);
const bodyText = z.string().trim().min(1).max(420);
const color = z.string().regex(/^#[0-9a-f]{6}$/iu);
const imageUrl = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (value) => value.startsWith("/") || /^https:\/\//iu.test(value),
    "Use a local path or an HTTPS image URL.",
  );

const landingNodeStyleSchema = z.object({
  x: z.number().finite().min(-600).max(600).default(0),
  y: z.number().finite().min(-600).max(600).default(0),
  widthPct: z.number().finite().min(15).max(100).default(100),
  fontSizePx: z.number().finite().min(8).max(160).nullable().default(null),
});

const nodeStyleMapSchema = z
  .record(landingNodeStyleSchema)
  .superRefine((styles, context) => {
    const allowed = new Set<string>(LANDING_NODE_IDS);
    for (const key of Object.keys(styles)) {
      if (!allowed.has(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown landing-page node: ${key}`,
          path: [key],
        });
      }
    }
  });

const hurdleId = z.enum([
  "time_management",
  "exam_stress",
  "complex_concepts",
  "staying_consistent",
]);
const scheduleId = z.enum(["morning", "after_practice", "late_night"]);

export const landingPageConfigSchema = z.object({
  version: z.literal(1),
  theme: z.object({
    canvas: color,
    surface: color,
    pink: color,
    blue: color,
    teal: color,
    heroImageOpacity: z.object({
      desktop: z.number().finite().min(0.2).max(1),
      mobile: z.number().finite().min(0.2).max(1),
    }),
  }),
  onboarding: z.object({
    hero: z.object({
      backgroundUrl: imageUrl,
      title: shortText,
      accentTitle: shortText,
      subtitle: bodyText,
      cta: shortText,
    }),
    education: z.object({
      eyebrow: shortText,
      title: shortText,
      statValue: shortText,
      statPrefix: shortText,
      statBrand: shortText,
      statMiddle: shortText,
      statResult: shortText,
      benefits: z
        .array(
          z.object({
            id: z.enum(["time", "precision"]),
            title: shortText,
            body: bodyText,
          }),
        )
        .length(2),
      cta: shortText,
    }),
    challenge: z.object({
      title: shortText,
      options: z
        .array(
          z.object({
            id: hurdleId,
            label: shortText,
            description: bodyText,
          }),
        )
        .length(4)
        .refine(
          (options) => new Set(options.map((option) => option.id)).size === 4,
          "Challenge options must be unique.",
        ),
      cta: shortText,
    }),
    schedule: z.object({
      title: shortText,
      choiceBadge: shortText,
      options: z
        .array(
          z.object({
            id: scheduleId,
            label: shortText,
            description: bodyText,
          }),
        )
        .length(3)
        .refine(
          (options) => new Set(options.map((option) => option.id)).size === 3,
          "Schedule options must be unique.",
        ),
      cta: shortText,
    }),
  }),
  community: z.object({
    title: shortText,
    accentTitle: shortText,
    subtitle: bodyText,
    proof: bodyText,
    proofTitle: shortText,
    proofSubtitle: shortText,
    facts: z
      .array(
        z.object({
          id: z.enum(["members", "privacy"]),
          value: shortText,
          label: shortText,
        }),
      )
      .length(2),
    planLabel: shortText,
    planTitle: shortText,
    planBody: bodyText,
    cta: shortText,
    footer: bodyText,
  }),
  standard: z.object({
    kicker: shortText,
    title: shortText,
    accentTitle: shortText,
    benefits: z
      .array(
        z.object({
          id: z.enum(["guided", "learning", "progress"]),
          title: shortText,
          body: bodyText,
        }),
      )
      .length(3),
    accessTitle: shortText,
    accessBody: bodyText,
    controlsTitle: shortText,
    controlsBody: bodyText,
    cta: shortText,
    footer: bodyText,
  }),
  nodeStyles: z.object({
    desktop: nodeStyleMapSchema,
    mobile: nodeStyleMapSchema,
  }),
});

export type LandingPageConfig = z.infer<typeof landingPageConfigSchema>;
export type LandingNodeStyle = z.infer<typeof landingNodeStyleSchema>;

export const DEFAULT_LANDING_PAGE_CONFIG: LandingPageConfig = {
  version: 1,
  theme: {
    canvas: "#0f172a",
    surface: "#1e293b",
    pink: "#ff79da",
    blue: "#74c0ff",
    teal: "#2dd4bf",
    heroImageOpacity: {
      desktop: 0.72,
      mobile: 0.6,
    },
  },
  onboarding: {
    hero: {
      backgroundUrl: "/screendesign/onboarding/welcome-background.png",
      title: "DIANA",
      accentTitle: "AI TUTOR",
      subtitle: "Your Academic Coach\nfor the Win.",
      cta: "GET STARTED",
    },
    education: {
      eyebrow: "Stat Report",
      title: "DID YOU KNOW?",
      statValue: "+40%",
      statPrefix: "Athletes who use",
      statBrand: "DIANA",
      statMiddle: "see a",
      statResult: "40% boost in GPA within one semester.",
      benefits: [
        {
          id: "time",
          title: "Save 10+ Hours/Week",
          body: "Automate your note-taking and study summaries to focus on your sport.",
        },
        {
          id: "precision",
          title: "Elite Precision",
          body: "Our AI focuses on exactly what you need to ace your next exam.",
        },
      ],
      cta: "CONTINUE",
    },
    challenge: {
      title: "WHAT'S YOUR BIGGEST HURDLE RIGHT NOW?",
      options: [
        {
          id: "time_management",
          label: "Time Management",
          description: "Balancing practice and study.",
        },
        {
          id: "exam_stress",
          label: "Exam Stress",
          description: "Clutch performance under pressure.",
        },
        {
          id: "complex_concepts",
          label: "Complex Concepts",
          description: "Hard topics made easy.",
        },
        {
          id: "staying_consistent",
          label: "Staying Consistent",
          description: "Hitting your study marks daily.",
        },
      ],
      cta: "NEXT STEP",
    },
    schedule: {
      title: "WHEN ARE YOU MOST\nIN THE ZONE?",
      choiceBadge: "Athletes Choice",
      options: [
        {
          id: "morning",
          label: "Morning Hustle",
          description: "Before classes & early gym sessions.",
        },
        {
          id: "after_practice",
          label: "After-Practice Grind",
          description: "Post-workout focus boost.",
        },
        {
          id: "late_night",
          label: "Late Night Sessions",
          description: "Quiet focus when everyone else is asleep.",
        },
      ],
      cta: "CONTINUE CHALLENGE",
    },
  },
  community: {
    title: "STUDY WITH YOUR TEAM",
    accentTitle: "WITHOUT PUBLIC RANKINGS",
    subtitle: "Academic support with private, account-scoped community controls.",
    proof:
      "Community spaces show only real groups and members your signed-in account is allowed to access.",
    proofTitle: "Membership-scoped",
    proofSubtitle: "No invented student profiles",
    facts: [
      {
        id: "members",
        value: "Real members",
        label: "Membership-scoped",
      },
      {
        id: "privacy",
        value: "Private by default",
        label: "Owner-controlled",
      },
    ],
    planLabel: "Supported Diana capabilities",
    planTitle: "Diana access",
    planBody: "Create an account to keep your private choices and continue.",
    cta: "Continue to access options",
    footer: "Billing authority stays on the server and community access stays private.",
  },
  standard: {
    kicker: "Account upgrade",
    title: "GO FURTHER",
    accentTitle: "WITH DIANA",
    benefits: [
      {
        id: "guided",
        title: "Guided study tools",
        body: "Use class-aware support while keeping your original work and authorship visible.",
      },
      {
        id: "learning",
        title: "Learning tools",
        body: "Plan real assignments around your schedule, accommodations, and next move.",
      },
      {
        id: "progress",
        title: "Private progress",
        body: "Keep progress, portfolios, exports, and sharing controls in your account.",
      },
    ],
    accessTitle: "Diana access",
    accessBody: "Create a private account to continue. No purchase is claimed.",
    controlsTitle: "Account controls",
    controlsBody: "Private controls become available after account creation.",
    cta: "Create your account",
    footer: "Checkout appears only when the server confirms a configured provider.",
  },
  nodeStyles: {
    desktop: {},
    mobile: {},
  },
};

export function cloneLandingPageConfig(
  config: LandingPageConfig = DEFAULT_LANDING_PAGE_CONFIG,
): LandingPageConfig {
  return structuredClone(config);
}

export function parseLandingPageConfig(value: unknown): LandingPageConfig {
  const result = landingPageConfigSchema.safeParse(value);
  return result.success
    ? result.data
    : cloneLandingPageConfig(DEFAULT_LANDING_PAGE_CONFIG);
}

export function landingNodeStyle(
  config: LandingPageConfig,
  breakpoint: LandingBreakpoint,
  nodeId: LandingNodeId,
): LandingNodeStyle {
  return (
    config.nodeStyles[breakpoint][nodeId] ?? {
      x: 0,
      y: 0,
      widthPct: 100,
      fontSizePx: null,
    }
  );
}
