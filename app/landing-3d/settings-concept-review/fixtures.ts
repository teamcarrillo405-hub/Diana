export const SECTIONS = [
  { id: "profile", label: "Profile", group: "Personal", subtitle: "Your details" },
  { id: "appearance", label: "Appearance", group: "Personal", subtitle: "Your space" },
  { id: "notifications", label: "Notifications", group: "Personal", subtitle: "Your attention" },
  { id: "accessibility", label: "Accessibility", group: "Personal", subtitle: "Your reading experience" },
  { id: "goals", label: "Goals", group: "Diana", subtitle: "Your next step" },
  { id: "learning", label: "Do the work", group: "Diana", subtitle: "Personalization" },
  { id: "study", label: "Study", group: "Diana", subtitle: "Assignment-based practice" },
  { id: "ai", label: "AI & integrity", group: "Diana", subtitle: "Your activity record" },
  { id: "connections", label: "Connections & IEP", group: "School", subtitle: "School and learning supports" },
  { id: "sign-out", label: "Sign out", group: "Account", subtitle: "Your session" },
] as const;

export type SectionId = typeof SECTIONS[number]["id"];

export function resolveSection(value?: string | string[]): SectionId {
  const first = Array.isArray(value) ? value[0] : value;
  if (first === "reading") return "accessibility";
  if (first === "learning-loop") return "learning";
  return SECTIONS.find(section => section.id === first)?.id ?? "profile";
}

export const SAMPLE_PREFERENCES = {
  display_name: "Alex Morgan", school_year: "10", timezone: "America/Los_Angeles",
  learning_hurdle: "time_management", study_schedule_preference: "after_practice", consent_ai: true,
  theme: "dark", accent: "violet", font_size: "normal", line_spacing: "normal", reading_font: "lexend",
  reduced_motion: false, high_contrast: false, tts_enabled: false, tts_provider: "browser",
  tts_speed: 1, tts_pitch: 1, tts_voice: "default", bionic_reading: false, visual_pacing: "off",
  line_focus: false, reading_letter_spacing: "normal", reading_word_spacing: "normal",
  push_enabled: false, local_reminders: false, learning_loop_paused: false,
};

export type Preferences = typeof SAMPLE_PREFERENCES;
export type PreferenceKey = keyof Preferences;
export type SampleGoal = { title: string; category: string; targetText: string; nextStep: string };
export type SampleSettings = { preferences: Preferences; goals: SampleGoal[] };

export const SAMPLE_SETTINGS: SampleSettings = {
  preferences: SAMPLE_PREFERENCES,
  goals: [{ title: "Make room for reading", category: "skill", targetText: "Read one chapter this week", nextStep: "Choose a book for tonight" }],
};

export type Option = { value: string; label: string };
export type Field = {
  key: PreferenceKey;
  label: string;
  help: string;
  kind: "text" | "select" | "toggle" | "range" | "swatches";
  options?: readonly Option[];
  min?: number;
  max?: number;
  step?: number;
  visible?: (preferences: Preferences) => boolean;
};

const options = (values: string[]): Option[] => values.map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) }));

export const ACCENTS = [
  { value: "sky", label: "Diana cyan", color: "#35ddf2" },
  { value: "rose", label: "Diana pink", color: "#f45ba8" },
  { value: "amber", label: "Diana gold", color: "#e8b85d" },
  { value: "indigo", label: "Diana blue", color: "#5e8cff" },
  { value: "violet", label: "Diana purple", color: "#a477ff" },
] as const;

export const PROFILE_FIELDS: Field[] = [
  { key: "display_name", label: "Display name", kind: "text", help: "The name on your profile and navigation. This is a sample identity, not your account." },
  { key: "school_year", label: "School year", kind: "select", help: "Used for age-appropriate learning context. The sample profile is a Grade 10 student.", options: [{ value: "", label: "Not set" }, ...Array.from({ length: 11 }, (_, index) => ({ value: String(index + 6), label: index < 7 ? `Grade ${index + 6}` : `College year ${index - 6}` }))] },
  { key: "timezone", label: "Timezone", kind: "text", help: "Dates and due times follow this timezone. Use a timezone such as America/Los_Angeles." },
  { key: "learning_hurdle", label: "Main learning hurdle", kind: "select", help: "The area where a little support would help. This does not label or score you.", options: [{ value: "", label: "Not set" }, { value: "time_management", label: "Managing time" }, { value: "exam_stress", label: "Exam stress" }, { value: "complex_concepts", label: "Complex concepts" }, { value: "staying_consistent", label: "Staying consistent" }] },
  { key: "study_schedule_preference", label: "Best study time", kind: "select", help: "Your existing profile preference for when study fits. It does not create a calendar event.", options: [{ value: "", label: "Not set" }, { value: "morning", label: "Morning" }, { value: "after_practice", label: "After practice" }, { value: "late_night", label: "Late night" }] },
  { key: "consent_ai", label: "Allow age-appropriate AI coaching", kind: "toggle", help: "AI consent belongs to Profile. This sample toggle does not change consent on a real account or call an AI service." },
];

export const APPEARANCE_FIELDS: Field[] = [
  { key: "theme", label: "Theme", kind: "select", options: [{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }, { value: "system", label: "Device" }], help: "The live theme is a device preference. Apply changes only the surface in this preview; your app theme stays unchanged." },
  { key: "accent", label: "Color", kind: "swatches", help: "The existing five accent choices. Apply updates the sample swatch in this detail, not the app's saved accent." },
];

export const ACCESSIBILITY_FIELDS: Field[] = [
  { key: "font_size", label: "Font size", kind: "select", options: [{ value: "small", label: "Small" }, { value: "normal", label: "Normal" }, { value: "large", label: "Large" }, { value: "xlarge", label: "Extra large" }], help: "Apply to review reading text at this size in the detail area. Labels remain readable at every width." },
  { key: "line_spacing", label: "Line spacing", kind: "select", options: options(["compact", "normal", "loose"]), help: "The space between lines of reading text. Your draft stays available while you visit another section." },
  { key: "reading_font", label: "Reading font", kind: "select", options: [{ value: "system", label: "System" }, { value: "lexend", label: "Lexend" }, { value: "atkinson", label: "Atkinson" }, { value: "opendyslexic", label: "OpenDyslexic" }], help: "Apply to compare the sample reading text. Display headings remain separate from reading typography." },
  { key: "reduced_motion", label: "Reduced motion", kind: "toggle", help: "Stops the preview's transitions after Apply. Your device's reduced-motion preference is always respected." },
  { key: "high_contrast", label: "High contrast", kind: "toggle", help: "Apply for solid surfaces and stronger text and control boundaries in this preview." },
  { key: "bionic_reading", label: "Bionic reading", kind: "toggle", help: "Retains the existing reading preference. The sample reading text emphasizes the start of words after Apply." },
  { key: "visual_pacing", label: "Visual pacing", kind: "select", options: options(["off", "word", "line"]), help: "Retains the existing pacing preference. Animated word and line pacing is not simulated in this options preview." },
  { key: "line_focus", label: "Line focus", kind: "toggle", help: "Retains the existing line-focus preference. The full interactive reading overlay belongs to the reader, not this screen." },
  { key: "reading_letter_spacing", label: "Reading letter spacing", kind: "select", options: options(["normal", "wide", "wider"]), help: "Retains your reader spacing choice. This menu keeps its own labels at normal spacing." },
  { key: "reading_word_spacing", label: "Reading word spacing", kind: "select", options: options(["normal", "wide", "wider"]), help: "The spacing between words in the reading sample after Apply." },
  { key: "tts_enabled", label: "Text to speech", kind: "toggle", help: "Reveals the existing provider controls. No speech or audio service runs in this preview." },
  { key: "tts_provider", label: "Voice provider", kind: "select", options: [{ value: "browser", label: "Browser" }, { value: "openai", label: "OpenAI" }, { value: "elevenlabs", label: "ElevenLabs" }], visible: p => p.tts_enabled, help: "Browser and cloud providers remain distinct choices. Nothing is connected or played." },
  { key: "tts_voice", label: "Voice", kind: "select", options: [{ value: "alloy", label: "Alloy" }, { value: "echo", label: "Echo" }, { value: "fable", label: "Fable" }, { value: "nova", label: "Nova" }, { value: "shimmer", label: "Shimmer" }], visible: p => p.tts_enabled && p.tts_provider === "openai", help: "A sample OpenAI voice selection. Choosing a voice does not request audio." },
  { key: "tts_voice", label: "ElevenLabs voice", kind: "select", options: [{ value: "EXAVITQu4vr4xnSDxMaL", label: "Bella" }, { value: "21m00Tcm4TlvDq8ikWAM", label: "Rachel" }, { value: "JBFqnCBsd6RMkjVDRZzb", label: "Calm" }], visible: p => p.tts_enabled && p.tts_provider === "elevenlabs", help: "These are the existing example voice IDs, not connected accounts." },
  { key: "tts_voice", label: "Custom voice ID", kind: "text", visible: p => p.tts_enabled && p.tts_provider === "elevenlabs", help: "A custom ElevenLabs voice ID stays local to this sample. No account or voice is checked." },
  { key: "tts_speed", label: "Reading speed", kind: "select", options: [0.75, 1, 1.15, 1.25].map(value => ({ value: String(value), label: `${value}x` })), visible: p => p.tts_enabled, help: "Adjusts the sample preference only. No audio playback is started." },
  { key: "tts_pitch", label: "Voice pitch", kind: "select", options: [0.85, 1, 1.15].map(value => ({ value: String(value), label: `${value}x` })), visible: p => p.tts_enabled, help: "Retains the voice-pitch preference without requesting any audio." },
];

export const NOTIFICATION_FIELDS: Field[] = [
  { key: "push_enabled", label: "Daily heads-up", kind: "toggle", help: "Sample Web Push opt-in for this device. This preview never requests browser notification permission." },
  { key: "local_reminders", label: "Local reminders", kind: "toggle", help: "Local PWA reminders are separate from Web Push. Neither setting registers a service worker in this preview." },
];

export const CONNECTIONS = [
  { id: "canvas", name: "Canvas LMS", status: "Connected and synced", scopes: ["Classes", "Assignments", "Due dates"], detail: "Sample school connection. School content is read into Diana; no school account is connected here." },
  { id: "google", name: "Google Classroom", status: "Needs attention", scopes: ["Classes", "Coursework", "Optional Calendar access"], detail: "Sample attention state. Calendar is a separate optional permission; reviewing it does not start OAuth or sync." },
  { id: "clever", name: "Clever", status: "Managed by school", scopes: ["School-managed class context"], detail: "Sample school-managed connection. There is no student reconnect action in this preview." },
  { id: "canva", name: "Canva design workspace", status: "Not connected", scopes: ["Design workspace"], detail: "Canva is the design workspace, not Canvas LMS. No design is created and no authorization is requested." },
] as const;

export type PreviewState = { draft: SampleSettings; applied: SampleSettings; history: SampleSettings[]; message: string };
export const INITIAL_STATE: PreviewState = { draft: SAMPLE_SETTINGS, applied: SAMPLE_SETTINGS, history: [], message: "Sample settings only" };
type Edit = { type: "edit"; key: PreferenceKey; value: Preferences[PreferenceKey] };
export type PreviewAction = Edit | { type: "goal"; goal: SampleGoal } | { type: "apply" } | { type: "undo" } | { type: "reset" };

export function changeCount(draft: SampleSettings, applied: SampleSettings) {
  return (Object.keys(draft.preferences) as PreferenceKey[]).filter(key => draft.preferences[key] !== applied.preferences[key]).length
    + Number(JSON.stringify(draft.goals) !== JSON.stringify(applied.goals));
}

export function previewReducer(state: PreviewState, action: PreviewAction): PreviewState {
  if (action.type === "apply") return { ...state, applied: state.draft, message: "Applied to preview" };
  if (action.type === "undo") {
    const previous = state.history.at(-1);
    return previous ? { ...state, draft: previous, history: state.history.slice(0, -1), message: "Last draft change undone" } : state;
  }
  if (action.type === "reset") return changeCount(state.draft, state.applied) ? { ...state, draft: state.applied, history: [...state.history, state.draft].slice(-40), message: "Draft reset to applied preview settings" } : state;
  let draft: SampleSettings;
  if (action.type === "goal") draft = { ...state.draft, goals: [...state.draft.goals, action.goal] };
  else {
    if (state.draft.preferences[action.key] === action.value) return state;
    const preferences = { ...state.draft.preferences, [action.key]: action.value };
    if (action.key === "tts_provider") preferences.tts_voice = action.value === "browser" ? "default" : action.value === "openai" ? "nova" : "EXAVITQu4vr4xnSDxMaL";
    draft = { ...state.draft, preferences };
  }
  return { ...state, draft, history: [...state.history, state.draft].slice(-40), message: "Preview draft updated" };
}
