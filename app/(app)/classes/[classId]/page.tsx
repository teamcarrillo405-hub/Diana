import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AssignmentList } from "@/components/assignments/assignment-list"

const STATE_ORDER = ["in_progress", "planned", "captured", "done", "submitted", "graded"]

export default async function ClassPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: cls } = await supabase
    .from("classes")
    .select("*, class_documents(*)")
    .eq("id", classId)
    .eq("user_id", user!.id)
    .single()

  if (!cls) notFound()

  const { data: assignments } = await supabase
    .from("assignments")
    .select("*")
    .eq("class_id", classId)
    .order("due_at", { ascending: true, nullsFirst: false })

  const sorted = (assignments ?? []).sort(
    (a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state)
  )

  const AI_LABELS: Record<string, string> = {
    red: "Socratic only",
    yellow: "Step guidance",
    green: "Full assist",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full mt-0.5" style={{ backgroundColor: cls.color }} />
          <div>
            <h1 className="text-xl font-bold text-stone-900">{cls.name}</h1>
            {cls.teacher_name && (
              <p className="text-sm text-stone-400">{cls.teacher_name}</p>
            )}
          </div>
        </div>
        <Badge variant="outline">{AI_LABELS[cls.ai_policy]}</Badge>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Assignments</h2>
        <Link href={`/classes/${classId}/assignments/new`} className="inline-flex items-center justify-center rounded-[min(var(--radius-md),12px)] bg-primary text-primary-foreground px-2.5 h-7 text-[0.8rem] font-medium transition-all hover:bg-primary/80">
          Add assignment
        </Link>
      </div>

      <AssignmentList assignments={sorted} classId={classId} />
    </div>
  )
}
