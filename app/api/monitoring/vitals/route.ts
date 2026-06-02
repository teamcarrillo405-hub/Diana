import { NextResponse } from "next/server";
import { z } from "zod";
import { webVitalStatus } from "@/lib/platform/analytics";
import { createClient } from "@/lib/supabase/server";

const VitalBody = z.object({
  route: z.string().trim().min(1).max(240),
  metricName: z.string().trim().min(2).max(20),
  value: z.number().min(0),
  budgetValue: z.number().min(0).nullable().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = VitalBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const status = webVitalStatus(parsed.data.metricName, parsed.data.value, parsed.data.budgetValue);
  const { error } = await supabase.from("performance_events").insert({
    owner_id: user.id,
    route: parsed.data.route,
    metric_name: status.metricName,
    value: parsed.data.value,
    budget_value: status.budget,
  });

  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true, status: status.status });
}
