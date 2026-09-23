import { withStudentCors } from "./cors.ts";
import { requireOwnedStorageObject, requireStudentContext } from "./student-auth.ts";

type JsonBody = Record<string, unknown>;

const STORAGE_RULES: Record<string, { bucket: string; keyField: string }> = {
  "extract-note-doc": { bucket: "note-docs", keyField: "storageKey" },
  "history-scaffold": { bucket: "note-docs", keyField: "storageKey" },
  "math-scaffold": { bucket: "note-docs", keyField: "storageKey" },
  "transcribe-voice": { bucket: "note-audio", keyField: "audioStorageKey" },
  "visual-tools": { bucket: "note-docs", keyField: "storageKey" },
};

function ownedResourceFor(functionName: string, body: JsonBody) {
  if (functionName === "classify-inbox") {
    return { table: "inbox_items", id: body.inboxItemId };
  }
  if (functionName === "extract-assignment-source") {
    return {
      table: "assignment_sources",
      id: body.sourceId,
      assignmentIdColumn: "assignment_id",
    };
  }
  return undefined;
}

function securedJsonRequest(request: Request, body: JsonBody, ownerId: string): Request {
  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");
  return new Request(request.url, {
    method: request.method,
    headers,
    body: JSON.stringify({ ...body, ownerId }),
    signal: request.signal,
  });
}

export function withStudentSecurity(
  functionName: string,
  handler: (request: Request) => Response | Promise<Response>,
): (request: Request) => Promise<Response> {
  return withStudentCors(async (request) => {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed." }), {
        status: 405,
        headers: { "Content-Type": "application/json", Allow: "POST, OPTIONS" },
      });
    }

    let body: JsonBody;
    try {
      body = await request.clone().json() as JsonBody;
    } catch {
      return new Response(JSON.stringify({ error: "JSON request body required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const auth = await requireStudentContext(request, {
      suppliedOwnerId: body.ownerId,
      assignmentId: body.assignmentId,
      classId: body.classId,
      noteId: body.noteId,
      ownedResource: ownedResourceFor(functionName, body),
      requireAiGreen: true,
    });
    if (auth instanceof Response) return auth;

    const storageRule = STORAGE_RULES[functionName];
    if (storageRule && body[storageRule.keyField] !== undefined && body[storageRule.keyField] !== null) {
      const requestedBucket = body.bucket ?? storageRule.bucket;
      const storage = requireOwnedStorageObject(
        auth.ownerId,
        requestedBucket,
        body[storageRule.keyField],
        new Set([storageRule.bucket]),
      );
      if (storage instanceof Response) return storage;
      body.bucket = storage.bucket;
      body[storageRule.keyField] = storage.storageKey;
    }

    return handler(securedJsonRequest(request, body, auth.ownerId));
  });
}
