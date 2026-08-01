"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const AcknowledgeInput = z.object({
  assignmentId: z.string().uuid(),
  protocolId: z.string().uuid(),
});

type SafetyRpcClient = {
  rpc(
    name: "acknowledge_assignment_safety_protocol",
    args: { p_assignment_id: string; p_protocol_id: string },
  ): Promise<{ data: boolean | null; error: { message: string } | null }>;
};

export async function acknowledgeAssignmentSafetyProtocol(
  input: z.infer<typeof AcknowledgeInput>,
) {
  const parsed = AcknowledgeInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Safety protocol could not be identified." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const client = supabase as unknown as SafetyRpcClient;
  const { data, error } = await client.rpc("acknowledge_assignment_safety_protocol", {
    p_assignment_id: parsed.data.assignmentId,
    p_protocol_id: parsed.data.protocolId,
  });
  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "This protocol is not available for this assignment." };
  revalidatePath(`/assignments/${parsed.data.assignmentId}/workspace`);
  return { ok: true as const };
}
