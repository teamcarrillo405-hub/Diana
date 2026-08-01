import { createServiceClient } from "@/lib/supabase/service";

/** Privileged AI accounting/logging client. This module is server-runtime only. */
export function createAiServiceClient() {
  if (typeof window !== "undefined") {
    throw new Error("ai_service_client_server_only");
  }
  return createServiceClient();
}
