import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildMasteryReportPdf } from "@/lib/mastery/pdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: cls }, { data: concepts }, { data: assignments }] = await Promise.all([
    supabase.from("classes").select("id, name").eq("id", id).single(),
    supabase
      .from("mastery_concepts")
      .select("name, mastery_level, self_confidence")
      .eq("class_id", id)
      .order("mastery_level", { ascending: true }),
    supabase
      .from("assignments")
      .select("title, status")
      .eq("class_id", id)
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(20),
  ]);

  if (!cls) {
    return new NextResponse("Not found", { status: 404 });
  }

  const pdf = buildMasteryReportPdf({
    className: cls.name,
    concepts: (concepts ?? []).map((concept) => ({
      name: concept.name,
      masteryLevel: Number(concept.mastery_level ?? 0),
      selfConfidence: concept.self_confidence === null ? null : Number(concept.self_confidence),
    })),
    assignments: (assignments ?? []).map((assignment) => ({
      title: assignment.title,
      status: assignment.status,
    })),
  });
  const body = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;

  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${cls.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-mastery.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
