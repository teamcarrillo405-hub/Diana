export type SubmissionCapability = "open_external" | "submit_text" | "upload_file";

export type SubmissionReceiptStatus = "prepared" | "confirmation_pending" | "submitted" | "not_accepted";

export type ProviderSubmissionCapabilities = {
  provider: "canvas" | "google_classroom" | "other";
  capabilities: SubmissionCapability[];
  note: string;
  allowedExtensions: string[];
  providerSubmissionId: string | null;
  providerState: string | null;
  providerCanSubmit?: boolean | null;
  providerLocked?: boolean | null;
};

export type ProviderSubmissionResolution = {
  status: "submitted" | "confirmation_pending" | "not_accepted";
  detail: string;
  providerReceiptId: string | null;
  providerResponse: Record<string, unknown>;
};

type AssignmentCapabilityData =
  | {
      provider: "canvas";
      data: {
        submissionTypes: string[];
        canSubmit: boolean;
        lockedForUser: boolean;
        allowedExtensions?: string[];
        submissionId?: string | null;
        workflowState?: string | null;
      };
    }
  | {
      provider: "google_classroom";
      data: {
        courseWorkType: string | null;
        associatedWithDeveloper: boolean;
        submissionId: string | null;
        submissionState: string | null;
      };
    };

const GOOGLE_EDITABLE_STATES = new Set(["CREATED", "RETURNED", "RECLAIMED_BY_STUDENT"]);

export function submissionCapabilities(
  provider: string | null,
  assignment?: AssignmentCapabilityData,
): ProviderSubmissionCapabilities {
  if (provider === "canvas") {
    if (!assignment || assignment.provider !== "canvas") {
      return {
        provider,
        capabilities: ["open_external"],
        note: "Checking which submission options this Canvas assignment accepts.",
        allowedExtensions: [],
        providerSubmissionId: null,
        providerState: null,
      };
    }
    const { data } = assignment;
    if (data.lockedForUser || !data.canSubmit) {
      return {
        provider,
        capabilities: ["open_external"],
        note: "Canvas is not accepting a new submission for this assignment.",
        allowedExtensions: data.allowedExtensions ?? [],
        providerSubmissionId: data.submissionId ?? null,
        providerState: data.workflowState ?? null,
        providerCanSubmit: data.canSubmit,
        providerLocked: data.lockedForUser,
      };
    }
    const capabilities: SubmissionCapability[] = ["open_external"];
    if (data.submissionTypes.includes("online_text_entry")) capabilities.push("submit_text");
    if (data.submissionTypes.includes("online_upload")) capabilities.push("upload_file");
    return {
      provider,
      capabilities,
      note: capabilities.length > 1
        ? "Diana will use only the submission options enabled for this Canvas assignment."
        : "This Canvas assignment needs to be completed in Canvas.",
      allowedExtensions: data.allowedExtensions ?? [],
      providerSubmissionId: data.submissionId ?? null,
      providerState: data.workflowState ?? null,
      providerCanSubmit: data.canSubmit,
      providerLocked: data.lockedForUser,
    };
  }

  if (provider === "google_classroom") {
    if (!assignment || assignment.provider !== "google_classroom") {
      return {
        provider,
        capabilities: ["open_external"],
        note: "Checking whether this Google Classroom assignment accepts a Diana file.",
        allowedExtensions: [],
        providerSubmissionId: null,
        providerState: null,
      };
    }
    const { data } = assignment;
    const canSubmitFile =
      data.courseWorkType === "ASSIGNMENT"
      && data.associatedWithDeveloper
      && data.submissionId !== null
      && data.submissionState !== null
      && GOOGLE_EDITABLE_STATES.has(data.submissionState);
    return {
      provider,
      capabilities: canSubmitFile ? ["open_external", "upload_file"] : ["open_external"],
      note: canSubmitFile
        ? "Diana can attach a finished file, then turn in this Google Classroom assignment."
        : data.submissionState === "TURNED_IN"
          ? "Google Classroom already shows this assignment as turned in."
          : "This assignment needs to be submitted in Google Classroom.",
      allowedExtensions: [],
      providerSubmissionId: data.submissionId,
      providerState: data.submissionState,
      providerCanSubmit: canSubmitFile,
    };
  }

  return {
    provider: "other",
    capabilities: ["open_external"],
    note: "This school system needs a guided handoff.",
    allowedExtensions: [],
    providerSubmissionId: null,
    providerState: null,
  };
}

const CANVAS_CONFIRMED_STATES = new Set(["submitted", "pending_review", "graded"]);
const GOOGLE_CONFIRMED_STATES = new Set(["TURNED_IN", "RETURNED"]);
const GOOGLE_PENDING_STATES = new Set(["NEW", "CREATED", "RECLAIMED_BY_STUDENT"]);

export function resolveProviderSubmissionStatus(
  inspection: ProviderSubmissionCapabilities,
): ProviderSubmissionResolution {
  const providerResponse = {
    provider: inspection.provider,
    provider_state: inspection.providerState,
    provider_can_submit: inspection.providerCanSubmit ?? null,
    provider_locked: inspection.providerLocked ?? null,
  };

  if (inspection.provider === "canvas") {
    const state = inspection.providerState?.toLowerCase() ?? null;
    if (state && CANVAS_CONFIRMED_STATES.has(state)) {
      return {
        status: "submitted",
        detail: "Canvas shows this assignment as submitted.",
        providerReceiptId: inspection.providerSubmissionId,
        providerResponse,
      };
    }
    if (inspection.providerLocked === true || inspection.providerCanSubmit === false) {
      return {
        status: "not_accepted",
        detail: "Canvas does not show a completed submission and is not accepting this attempt. Review the assignment before choosing whether to submit again.",
        providerReceiptId: inspection.providerSubmissionId,
        providerResponse,
      };
    }
    return {
      status: "confirmation_pending",
      detail: "Canvas does not show a completed submission yet. You can check again.",
      providerReceiptId: inspection.providerSubmissionId,
      providerResponse,
    };
  }

  if (inspection.provider === "google_classroom") {
    const state = inspection.providerState?.toUpperCase() ?? null;
    if (state && GOOGLE_CONFIRMED_STATES.has(state)) {
      return {
        status: "submitted",
        detail: "Google Classroom shows this assignment as submitted.",
        providerReceiptId: inspection.providerSubmissionId,
        providerResponse,
      };
    }
    if (state && GOOGLE_PENDING_STATES.has(state) && inspection.providerCanSubmit !== false) {
      return {
        status: "confirmation_pending",
        detail: "Google Classroom does not show this assignment as turned in yet. You can check again.",
        providerReceiptId: inspection.providerSubmissionId,
        providerResponse,
      };
    }
    return {
      status: "not_accepted",
      detail: "Google Classroom does not show a submission Diana can confirm. Review the assignment before choosing whether to submit again.",
      providerReceiptId: inspection.providerSubmissionId,
      providerResponse,
    };
  }

  return {
    status: "not_accepted",
    detail: "This school system does not provide submission status checks in Diana.",
    providerReceiptId: null,
    providerResponse,
  };
}
