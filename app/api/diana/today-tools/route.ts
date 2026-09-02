import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { saveInboxItem } from "@/app/(app)/quick-add/actions";
import { startFocusSession } from "@/app/(app)/timer/actions";
import { runOpenAIHomeworkText, openAIHomeworkModel } from "@/lib/ai/openai-homework-adapter";
import { estimateTokenReservation, logInteraction, runSafeBudgetedAiCall } from "@/lib/ai/safety";
import { isTodayVoiceToolName, type TodayConfirmedAction, type TodayVoiceToolName } from "@/lib/dashboard/today-voice";
import { createAiServiceClient } from "@/lib/supabase/ai-service";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

const RequestInput = z.object({
  callId: z.string().trim().min(1).max(160),
  name: z.string().trim(),
  arguments: z.record(z.unknown()).default({}),
});

const ACTIONS = new Set<TodayVoiceToolName>(["open_destination", "start_focus_session", "create_quick_capture"]);
const DESTINATIONS: Record<string, string> = {
  next_move: "NEXT_MOVE",
  work: "/assignments",
  calendar: "/calendar",
  classes: "/classes",
  wellness: "/wellness",
  search: "/search",
  settings: "/settings",
};

type ConfirmationPayload = {
  ownerId: string;
  action: "open_destination" | "start_focus_session" | "create_quick_capture";
  args: Record<string, unknown>;
  nonce: string;
  exp: number;
};

function confirmationSecret() {
  return process.env.TODAY_ACTION_SECRET?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || process.env.OPENAI_API_KEY?.trim()
    || "";
}

function signPayload(payload: ConfirmationPayload): string {
  const secret = confirmationSecret();
  if (!secret) throw new Error("confirmation_not_configured");
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function readPayload(token: string, ownerId: string): ConfirmationPayload | null {
  const secret = confirmationSecret();
  const [encoded, signature] = token.split(".");
  if (!secret || !encoded || !signature) return null;
  const expected = createHmac("sha256", secret).update(encoded).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as ConfirmationPayload;
    if (payload.ownerId !== ownerId || payload.exp <= Date.now() || !ACTIONS.has(payload.action)) return null;
    return payload;
  } catch {
    return null;
  }
}

function clippedString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function activeAssignments(ownerId: string, limit = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assignments")
    .select("id, title, description, due_at, status, estimated_minutes, classes(name)")
    .eq("owner_id", ownerId)
    .not("status", "in", "(submitted,graded,abandoned)")
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(limit);
  return (data ?? []).map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    description: assignment.description?.slice(0, 260) ?? null,
    dueAt: assignment.due_at,
    status: assignment.status,
    estimatedMinutes: assignment.estimated_minutes,
    className: Array.isArray(assignment.classes) ? assignment.classes[0]?.name : assignment.classes?.name,
  }));
}

async function getWeather(args: Record<string, unknown>) {
  let latitude = typeof args.latitude === "number" ? args.latitude : null;
  let longitude = typeof args.longitude === "number" ? args.longitude : null;
  const city = clippedString(args.city, 80);
  let locationLabel = city || "your area";

  if ((latitude === null || longitude === null) && city) {
    const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
    geoUrl.searchParams.set("name", city);
    geoUrl.searchParams.set("count", "1");
    geoUrl.searchParams.set("language", "en");
    const geoResponse = await fetch(geoUrl, { signal: AbortSignal.timeout(7_000) });
    const geo = await geoResponse.json().catch(() => ({})) as { results?: Array<{ latitude?: number; longitude?: number; name?: string; admin1?: string }> };
    const match = geo.results?.[0];
    latitude = typeof match?.latitude === "number" ? match.latitude : null;
    longitude = typeof match?.longitude === "number" ? match.longitude : null;
    locationLabel = [match?.name, match?.admin1].filter(Boolean).join(", ") || city;
  }
  if (latitude === null || longitude === null) {
    return { ok: false, needsLocation: true, message: "Ask to use browser location, or ask the student for a city for this session." };
  }

  latitude = Math.round(latitude * 100) / 100;
  longitude = Math.round(longitude * 100) / 100;
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,wind_speed_10m");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code");
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("forecast_days", "3");
  url.searchParams.set("timezone", "auto");
  const response = await fetch(url, { signal: AbortSignal.timeout(7_000) });
  if (!response.ok) return { ok: false, message: "Weather is unavailable right now." };
  const weather = await response.json() as {
    current?: { temperature_2m?: number; apparent_temperature?: number; weather_code?: number; wind_speed_10m?: number };
    daily?: { time?: string[]; temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_probability_max?: number[]; weather_code?: number[] };
  };
  return {
    ok: true,
    message: `Weather for ${locationLabel}: ${weather.current?.temperature_2m ?? "unknown"} degrees Fahrenheit, feels like ${weather.current?.apparent_temperature ?? "unknown"}.`,
    data: { location: locationLabel, current: weather.current, forecast: weather.daily },
  };
}

function responsesText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: unknown }> }> };
  if (typeof record.output_text === "string") return record.output_text;
  return (record.output ?? []).flatMap((item) => item.content ?? []).map((part) => typeof part.text === "string" ? part.text : "").filter(Boolean).join("\n");
}

async function searchCurrentInformation(ownerId: string, query: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const accounting = createAiServiceClient();
  if (!apiKey || !accounting) return { ok: false, message: "Current search is unavailable right now." };
  const model = openAIHomeworkModel("fast");
  const idempotencyKey = crypto.randomUUID();
  const guarded = await runSafeBudgetedAiCall({
    ownerId,
    supabase: accounting,
    input: query,
    systemPrompt: "Answer the student's current-information question briefly. Use web search and distinguish facts from uncertainty.",
    maxOutputTokens: 450,
    idempotencyKey,
    invoke: async () => {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, tools: [{ type: "web_search" }], input: query, max_output_tokens: 450 }),
      });
      if (!response.ok) throw new Error("today_search_unavailable");
      const payload = await response.json();
      return { text: responsesText(payload), payload };
    },
    getTokens: () => estimateTokenReservation({ systemPrompt: "current web search", input: query, maxOutputTokens: 450 }),
    getOutput: (value) => value.text,
  });
  if (!guarded.ok) return { ok: false, message: guarded.message };
  void logInteraction({ ownerId, assignmentId: null, feature: "agent_coach", model, correlationId: idempotencyKey, inputBytes: query.length, outputBytes: guarded.value.text.length, tokensUsed: 450 }, accounting);
  return { ok: true, message: guarded.value.text || "I could not find a clear current answer." };
}

async function issueConfirmation(ownerId: string, action: ConfirmationPayload["action"], args: Record<string, unknown>): Promise<TodayConfirmedAction> {
  const expiresAt = Date.now() + 5 * 60_000;
  const token = signPayload({ ownerId, action, args, nonce: crypto.randomUUID(), exp: expiresAt });
  if (action === "open_destination") {
    return { token, action, title: "Open this page?", detail: `Diana will open ${clippedString(args.destination, 40).replaceAll("_", " ")}.`, expiresAt };
  }
  if (action === "start_focus_session") {
    return { token, action, title: "Start focus?", detail: "Diana will start a 30 minute focus session for your Next Move.", expiresAt };
  }
  return { token, action, title: "Save this capture?", detail: clippedString(args.text, 160), expiresAt };
}

async function executeConfirmedAction(ownerId: string, payload: ConfirmationPayload) {
  const supabase = await createClient();
  const confirmationKey = createHash("sha256").update(payload.nonce).digest("hex");
  const { data: existing } = await supabase
    .from("authorship_log")
    .select("payload")
    .eq("owner_id", ownerId)
    .eq("event_type", "today_voice_action_completed")
    .contains("payload", { confirmationKey })
    .limit(1)
    .maybeSingle();
  if (existing?.payload && typeof existing.payload === "object" && !Array.isArray(existing.payload)) {
    const prior = existing.payload as Record<string, Json | undefined>;
    return { ok: true, message: String(prior.message ?? "That action is already complete."), data: prior.data };
  }

  let result: { ok: boolean; message: string; data?: unknown };
  if (payload.action === "open_destination") {
    const destination = clippedString(payload.args.destination, 40);
    let href = DESTINATIONS[destination];
    if (href === "NEXT_MOVE") href = `/assignments/${(await activeAssignments(ownerId, 1))[0]?.id ?? ""}`;
    result = href && !href.endsWith("/") ? { ok: true, message: "Opening that page now.", data: { href } } : { ok: false, message: "That page is not available." };
  } else if (payload.action === "start_focus_session") {
    const assignment = (await activeAssignments(ownerId, 1))[0];
    if (!assignment) result = { ok: false, message: "There is no active assignment to focus on." };
    else {
      const started = await startFocusSession({ assignmentId: assignment.id, durationMinutes: 30, clientSessionId: payload.nonce });
      result = started.ok
        ? { ok: true, message: "Your 30 minute focus session has started.", data: { href: `/assignments/${assignment.id}?focus=next-step`, session: started } }
        : { ok: false, message: started.error };
    }
  } else {
    const text = clippedString(payload.args.text, 1000);
    const saved = await saveInboxItem({ raw: text, captureMode: "text" });
    result = saved.ok
      ? { ok: true, message: "Your quick capture is saved.", data: { href: `/assignments/captures/${saved.id}` } }
      : { ok: false, message: saved.error };
  }

  if (result.ok) {
    await supabase.from("authorship_log").insert({
      owner_id: ownerId,
      assignment_id: null,
      actor: "student",
      event_type: "today_voice_action_completed",
      payload: { confirmationKey, action: payload.action, message: result.message, data: result.data ?? null } as Json,
    });
  }
  return result;
}

export async function POST(request: Request) {
  const parsed = RequestInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isTodayVoiceToolName(parsed.data.name)) {
    return NextResponse.json({ ok: false, message: "Diana could not understand that request." }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "Sign in to continue." }, { status: 401 });

  const { name, arguments: args } = parsed.data;
  try {
    if (name === "confirm_action") {
      const token = clippedString(args.token, 5000);
      const payload = readPayload(token, user.id);
      if (!payload) return NextResponse.json({ ok: false, message: "That confirmation expired. Ask Diana to prepare it again." }, { status: 409 });
      return NextResponse.json(await executeConfirmedAction(user.id, payload));
    }
    if (ACTIONS.has(name)) {
      const confirmation = await issueConfirmation(user.id, name as ConfirmationPayload["action"], args);
      return NextResponse.json({ ok: true, message: "Confirmation required.", confirmation });
    }
    if (name === "get_weather") return NextResponse.json(await getWeather(args));
    if (name === "list_assignments") {
      const assignments = await activeAssignments(user.id);
      return NextResponse.json({ ok: true, message: assignments.length ? `${assignments.length} active assignments found.` : "No active assignments.", data: assignments });
    }
    if (name === "list_calendar") {
      const assignments = await activeAssignments(user.id);
      const end = Date.now() + 7 * 86_400_000;
      const calendar = assignments.filter((item) => item.dueAt && Date.parse(item.dueAt) <= end);
      return NextResponse.json({ ok: true, message: calendar.length ? `${calendar.length} due dates in the next seven days.` : "Your next seven days are clear.", data: calendar });
    }
    if (name === "get_today_summary") {
      const assignments = await activeAssignments(user.id);
      return NextResponse.json({ ok: true, message: assignments[0] ? `Your Next Move is ${assignments[0].title}.` : "You are caught up.", data: { nextMove: assignments[0] ?? null, assignments } });
    }
    if (name === "search_current_information") {
      const query = clippedString(args.query, 300);
      return NextResponse.json(await searchCurrentInformation(user.id, query));
    }
    if (name === "answer_complex_question") {
      const question = clippedString(args.question, 1200);
      const accounting = createAiServiceClient();
      if (!accounting) return NextResponse.json({ ok: false, message: "Diana's reasoning service is unavailable right now." }, { status: 503 });
      const result = await runOpenAIHomeworkText({
        ownerId: user.id,
        assignmentId: null,
        accounting,
        task: "assignment_review",
        quality: "complex",
        maxOutputTokens: 700,
        idempotencyKey: parsed.data.callId,
        messages: [
          { role: "system", content: "Answer clearly for a high-school student. Use short sections, explain assumptions, and do not pretend uncertain facts are current." },
          { role: "user", content: question },
        ],
      });
      return NextResponse.json(result.ok ? { ok: true, message: result.value } : { ok: false, message: result.error });
    }
    return NextResponse.json({ ok: false, message: "That Diana tool is not available." }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, message: "Diana could not complete that request. Try again." }, { status: 503 });
  }
}

export const runtime = "nodejs";
