import { createClient, type SupabaseClient, type User } from "jsr:@supabase/supabase-js@2";
import {
  effectiveAiMode,
  evaluateProfileEligibility,
  isDeletionActive,
  isOwnedStoragePath,
  suppliedOwnerMatches,
} from "./auth-policy.ts";

const DEFAULT_STORAGE_BUCKETS = new Set(["note-docs", "note-audio", "inbox-photos"]);

type OwnedResource = {
  table: string;
  id: unknown;
  idColumn?: string;
  ownerColumn?: string;
  assignmentIdColumn?: string;
  classIdColumn?: string;
};

export type StudentAuthOptions = {
  suppliedOwnerId?: unknown;
  assignmentId?: unknown;
  classId?: unknown;
  noteId?: unknown;
  ownedResource?: OwnedResource;
  requireAiGreen?: boolean;
};

export type StudentAuthContext = {
  ownerId: string;
  user: User;
  userClient: SupabaseClient;
  serviceClient: SupabaseClient;
};

type GuardFailure = {
  error: string;
  code: string;
};

function failure(error: string, status: number, code: string): Response {
  return new Response(JSON.stringify({ error, code }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function optionalId(value: unknown, field: string): string | null | Response {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return failure(`${field} must be a string.`, 400, "invalid_request");
  return value;
}

async function requireOwnedClass(
  client: SupabaseClient,
  ownerId: string,
  classId: string,
): Promise<{ aiMode: unknown } | Response> {
  const { data, error } = await client
    .from("classes")
    .select("id, owner_id, ai_mode")
    .eq("id", classId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) return failure("Class access could not be verified.", 503, "authorization_unavailable");
  if (!data) return failure("Class not found.", 404, "resource_not_found");
  return { aiMode: data.ai_mode };
}

async function requireOwnedAssignment(
  client: SupabaseClient,
  ownerId: string,
  assignmentId: string,
): Promise<{ classId: string; aiMode: ReturnType<typeof effectiveAiMode> } | Response> {
  const { data, error } = await client
    .from("assignments")
    .select("id, owner_id, class_id, ai_mode_override")
    .eq("id", assignmentId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) return failure("Assignment access could not be verified.", 503, "authorization_unavailable");
  if (!data) return failure("Assignment not found.", 404, "resource_not_found");

  const ownedClass = await requireOwnedClass(client, ownerId, data.class_id);
  if (ownedClass instanceof Response) return ownedClass;
  return {
    classId: data.class_id,
    aiMode: effectiveAiMode(data.ai_mode_override, ownedClass.aiMode),
  };
}

async function requireOwnedNote(
  client: SupabaseClient,
  ownerId: string,
  noteId: string,
): Promise<{ assignmentId: string | null; classId: string | null } | Response> {
  const { data, error } = await client
    .from("notes")
    .select("id, owner_id, assignment_id, class_id")
    .eq("id", noteId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) return failure("Note access could not be verified.", 503, "authorization_unavailable");
  if (!data) return failure("Note not found.", 404, "resource_not_found");
  return {
    assignmentId: typeof data.assignment_id === "string" ? data.assignment_id : null,
    classId: typeof data.class_id === "string" ? data.class_id : null,
  };
}

async function requireOwnedResource(
  client: SupabaseClient,
  ownerId: string,
  resource: OwnedResource,
): Promise<Record<string, unknown> | Response> {
  const resourceId = optionalId(resource.id, "resource id");
  if (resourceId instanceof Response) return resourceId;
  if (!resourceId) return failure("Resource id required.", 400, "invalid_request");

  const idColumn = resource.idColumn ?? "id";
  const ownerColumn = resource.ownerColumn ?? "owner_id";
  const selectColumns = [idColumn, ownerColumn, resource.assignmentIdColumn, resource.classIdColumn]
    .filter((value): value is string => Boolean(value))
    .join(", ");
  const { data, error } = await client
    .from(resource.table)
    .select(selectColumns)
    .eq(idColumn, resourceId)
    .eq(ownerColumn, ownerId)
    .maybeSingle();
  if (error) return failure("Resource access could not be verified.", 503, "authorization_unavailable");
  if (!data) return failure("Resource not found.", 404, "resource_not_found");
  return data as Record<string, unknown>;
}

export async function requireStudentContext(
  request: Request,
  options: StudentAuthOptions = {},
): Promise<StudentAuthContext | Response> {
  const authorization = request.headers.get("Authorization")?.trim() ?? "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) {
    return failure("Valid user authorization required.", 401, "authentication_required");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
  if (!supabaseUrl || !anonKey) {
    return failure("Authentication service is not configured.", 503, "authentication_unavailable");
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return failure("Valid user authorization required.", 401, "authentication_required");
  }

  const ownerId = authData.user.id;
  if (options.suppliedOwnerId !== undefined && options.suppliedOwnerId !== null) {
    if (typeof options.suppliedOwnerId !== "string") {
      return failure("ownerId must be a string.", 400, "invalid_request");
    }
    if (!suppliedOwnerMatches(ownerId, options.suppliedOwnerId)) {
      return failure("ownerId does not match the authenticated user.", 403, "owner_mismatch");
    }
  }

  const [profileResult, deletionResult] = await Promise.all([
    userClient
      .from("profiles")
      .select("user_id, age_bracket, consent_ai")
      .eq("user_id", ownerId)
      .maybeSingle(),
    userClient
      .from("data_deletion_requests")
      .select("status")
      .eq("owner_id", ownerId)
      .in("status", ["requested", "processing"])
      .limit(1)
      .maybeSingle(),
  ]);

  if (profileResult.error || !profileResult.data) {
    return failure("Student profile access could not be verified.", 403, "profile_required");
  }
  if (deletionResult.error) {
    return failure("Account status could not be verified.", 503, "account_status_unavailable");
  }

  const eligibility = evaluateProfileEligibility(profileResult.data);
  if (!eligibility.allowed) {
    const message = eligibility.code === "under_13"
      ? "Diana AI is not available for under-13 accounts."
      : "AI consent is required before using Diana AI.";
    return failure(message, 403, eligibility.code);
  }
  if (isDeletionActive(deletionResult.data?.status)) {
    return failure("AI is unavailable while account deletion is active.", 403, "account_deletion_active");
  }

  const assignmentId = optionalId(options.assignmentId, "assignmentId");
  const classId = optionalId(options.classId, "classId");
  const noteId = optionalId(options.noteId, "noteId");
  if (assignmentId instanceof Response) return assignmentId;
  if (classId instanceof Response) return classId;
  if (noteId instanceof Response) return noteId;

  let policyAssignmentId = assignmentId;
  let policyClassId = classId;
  if (noteId) {
    const note = await requireOwnedNote(userClient, ownerId, noteId);
    if (note instanceof Response) return note;
    policyAssignmentId ??= note.assignmentId;
    policyClassId ??= note.classId;
  }

  if (options.ownedResource) {
    const resource = await requireOwnedResource(userClient, ownerId, options.ownedResource);
    if (resource instanceof Response) return resource;
    const resourceAssignmentId = options.ownedResource.assignmentIdColumn
      ? resource[options.ownedResource.assignmentIdColumn]
      : null;
    const resourceClassId = options.ownedResource.classIdColumn
      ? resource[options.ownedResource.classIdColumn]
      : null;
    if (!policyAssignmentId && typeof resourceAssignmentId === "string") policyAssignmentId = resourceAssignmentId;
    if (!policyClassId && typeof resourceClassId === "string") policyClassId = resourceClassId;
  }

  const requireAiGreen = options.requireAiGreen !== false;
  if (policyAssignmentId) {
    const assignment = await requireOwnedAssignment(userClient, ownerId, policyAssignmentId);
    if (assignment instanceof Response) return assignment;
    if (requireAiGreen && assignment.aiMode !== "green") {
      return failure("AI is not available for this assignment.", 403, "ai_policy_blocked");
    }
  } else if (policyClassId) {
    const ownedClass = await requireOwnedClass(userClient, ownerId, policyClassId);
    if (ownedClass instanceof Response) return ownedClass;
    if (requireAiGreen && effectiveAiMode(null, ownedClass.aiMode) !== "green") {
      return failure("AI is not available for this class.", 403, "ai_policy_blocked");
    }
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceKey) {
    return failure("Diana service access is not configured.", 503, "service_unavailable");
  }

  return {
    ownerId,
    user: authData.user,
    userClient,
    serviceClient: createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

export function requireOwnedStorageObject(
  ownerId: string,
  bucket: unknown,
  storageKey: unknown,
  allowedBuckets: ReadonlySet<string> = DEFAULT_STORAGE_BUCKETS,
): Response | { bucket: string; storageKey: string } {
  if (typeof bucket !== "string" || !allowedBuckets.has(bucket)) {
    return failure("Storage bucket is not allowed.", 403, "storage_bucket_blocked");
  }
  if (typeof storageKey !== "string" || !isOwnedStoragePath(ownerId, storageKey)) {
    return failure("Storage object is outside the authenticated user path.", 403, "storage_path_blocked");
  }
  return { bucket, storageKey };
}

export type { GuardFailure };
