import Link from "next/link";
import { ArrowLeft, FileDown } from "lucide-react";

import { fetchCanvasGrades } from "@/lib/lms/canvas";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "../../page-shell";

type CanvasConfig = { base_url: string; token: string };

export default async function TranscriptPage() {
  const supabase = await createClient();
  const { data: connections } = await supabase.from("lms_connections").select("config").eq("provider", "canvas").order("created_at", { ascending: false }).limit(1);
  const config = (connections?.[0]?.config ?? null) as CanvasConfig | null;
  let records: Awaited<ReturnType<typeof fetchCanvasGrades>> = [];
  let issue = false;
  if (config?.base_url && config.token) {
    try { records = await fetchCanvasGrades(config); } catch { issue = true; }
  }
  const graded = records.filter((record) => record.score !== null && record.pointsPossible !== null);

  return (
    <PageShell active="More" eyebrow="Academic transcript" title="Mastery transcript" subtitle="A private record from your connected LMS. Diana does not turn it into a public ranking." icon={FileDown} action={<Link href="/grades" className="sd-button"><ArrowLeft size={16} aria-hidden="true" />Grades</Link>}>
      {!config ? <div className="sd-panel sd-panel-pad"><p className="sd-subtitle">Connect Canvas in Settings to load the transcript.</p><Link href="/settings#connections" className="sd-button" style={{ marginTop: "1rem" }}>Open connections</Link></div> : issue ? <div className="sd-panel sd-panel-pad"><p className="sd-subtitle">Canvas did not answer just now. Your records are unchanged.</p></div> : graded.length ? (
        <div className="sd-panel sd-transcript-wrap"><table className="sd-transcript"><thead><tr><th>Course</th><th>Work</th><th>Score</th><th>Recorded</th></tr></thead><tbody>{graded.map((record) => <tr key={`${record.courseId}-${record.externalAssignmentId}`}><td>{record.courseName}</td><td>{record.title}</td><td>{formatScore(record.score, record.pointsPossible)}</td><td>{record.gradedAt ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(record.gradedAt)) : "Open"}</td></tr>)}</tbody></table></div>
      ) : <div className="sd-panel sd-panel-pad"><p className="sd-subtitle">No graded Canvas work is available yet.</p></div>}
    </PageShell>
  );
}

function formatScore(score: number | null, possible: number | null): string {
  if (score === null || possible === null || possible === 0) return "Open";
  return `${score}/${possible} (${Math.round((score / possible) * 100)}%)`;
}
