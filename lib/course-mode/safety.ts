import type { AssignmentSafetyClass, SubjectDomain } from "@/lib/assignment-profile";

export type SafetyProtocol = {
  id: string;
  version: number;
  approved: boolean;
  sourceUri: string;
  teacherId: string | null;
  requiredPpe: string[];
  supervisionRequired: boolean;
  emergencySteps: string[];
  disposalSteps: string[];
  minimumAge: number | null;
};

export type PracticalActivityRequest = {
  subjectDomain: SubjectDomain;
  safetyClass: AssignmentSafetyClass;
  protocol: SafetyProtocol | null;
  studentAcknowledgedProtocol: boolean;
  teacherUnlocked: boolean;
  supervisedSessionActive: boolean;
  studentAge: number | null;
};

export type PracticalActivityGate = {
  theoryAvailable: true;
  practicalAvailable: boolean;
  reasons: string[];
};

export function evaluatePracticalActivity(request: PracticalActivityRequest): PracticalActivityGate {
  if (!["workshop_hazard", "lab_hazard", "physical_activity"].includes(request.safetyClass)) {
    return { theoryAvailable: true, practicalAvailable: true, reasons: [] };
  }
  const reasons: string[] = [];
  const protocol = request.protocol;
  if (!protocol?.approved || !protocol.sourceUri.trim() || !protocol.teacherId) {
    reasons.push("An approved teacher or manufacturer protocol is required.");
  }
  if (protocol && protocol.requiredPpe.length === 0 && request.safetyClass !== "physical_activity") {
    reasons.push("Required protective equipment must be listed.");
  }
  if (!request.studentAcknowledgedProtocol) reasons.push("Review and acknowledge the approved safety protocol.");
  if (!request.teacherUnlocked) reasons.push("A teacher must unlock the practical activity.");
  if ((protocol?.supervisionRequired ?? true) && !request.supervisedSessionActive) {
    reasons.push("The practical activity requires active in-person supervision.");
  }
  if (
    protocol?.minimumAge !== null &&
    protocol?.minimumAge !== undefined &&
    (request.studentAge === null || request.studentAge < protocol.minimumAge)
  ) {
    reasons.push("The approved protocol has an age requirement.");
  }
  return { theoryAvailable: true, practicalAvailable: reasons.length === 0, reasons };
}

const PROHIBITED_HEALTH_METRICS = /\b(weight|body mass index|bmi|calorie|body fat|body shape|attractiveness)\b/iu;

export function validatePeHealthPrompt(prompt: string): {
  allowed: boolean;
  reason: string | null;
} {
  return PROHIBITED_HEALTH_METRICS.test(prompt)
    ? { allowed: false, reason: "Use skill, recovery, knowledge, and student-owned wellbeing goals instead of body or calorie ranking." }
    : { allowed: true, reason: null };
}

export function mayGenerateProcedure(safetyClass: AssignmentSafetyClass): boolean {
  return safetyClass !== "workshop_hazard" && safetyClass !== "lab_hazard";
}
