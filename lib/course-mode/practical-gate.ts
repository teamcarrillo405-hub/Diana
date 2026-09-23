import type { Json } from "@/lib/supabase/types";

export type AssignmentSafetyProtocolView = {
  id: string;
  version: number;
  title: string;
  safetyClass: "physical_activity" | "workshop_hazard" | "lab_hazard";
  sourceUri: string;
  procedureSteps: string[];
  requiredPpe: string[];
  emergencySteps: string[];
  disposalSteps: string[];
  supervisionRequired: boolean;
  minimumAge: number | null;
};

export type AssignmentPracticalGateView = {
  connected: boolean;
  acknowledged: boolean;
  teacherUnlocked: boolean;
  supervisionActive: boolean;
  ageEligible: boolean;
  protocol: AssignmentSafetyProtocolView | null;
};

const EMPTY_GATE: AssignmentPracticalGateView = {
  connected: false,
  acknowledged: false,
  teacherUnlocked: false,
  supervisionActive: false,
  ageEligible: false,
  protocol: null,
};

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

export function parseAssignmentPracticalGate(value: Json | null | undefined): AssignmentPracticalGateView {
  if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY_GATE;
  const candidate = value as Record<string, Json | undefined>;
  const rawProtocol = candidate.protocol;
  let protocol: AssignmentSafetyProtocolView | null = null;
  if (rawProtocol && typeof rawProtocol === "object" && !Array.isArray(rawProtocol)) {
    const item = rawProtocol as Record<string, Json | undefined>;
    const safetyClass = item.safetyClass;
    if (
      typeof item.id === "string" &&
      typeof item.version === "number" &&
      typeof item.title === "string" &&
      typeof item.sourceUri === "string" &&
      (safetyClass === "physical_activity" || safetyClass === "workshop_hazard" || safetyClass === "lab_hazard")
    ) {
      protocol = {
        id: item.id,
        version: item.version,
        title: item.title,
        safetyClass,
        sourceUri: item.sourceUri,
        procedureSteps: stringList(item.procedureSteps),
        requiredPpe: stringList(item.requiredPpe),
        emergencySteps: stringList(item.emergencySteps),
        disposalSteps: stringList(item.disposalSteps),
        supervisionRequired: item.supervisionRequired !== false,
        minimumAge: typeof item.minimumAge === "number" ? item.minimumAge : null,
      };
    }
  }
  return {
    connected: candidate.connected === true,
    acknowledged: candidate.acknowledged === true,
    teacherUnlocked: candidate.teacherUnlocked === true,
    supervisionActive: candidate.supervisionActive === true,
    ageEligible: candidate.ageEligible === true,
    protocol,
  };
}
