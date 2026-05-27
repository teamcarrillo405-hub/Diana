import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const AI_POLICY_LABELS: Record<string, string> = {
  red: "Socratic only",
  yellow: "Step guidance",
  green: "Full assist",
}

export default async function ClassesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: classes } = await supabase
    .from("classes")
    .select("*, assignments(id, state)")
    .eq("owner_id", user!.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-900">Classes</h1>
        <Link href="/classes/new" className="inline-flex items-center justify-center rounded-[min(var(--radius-md),12px)] bg-primary text-primary-foreground px-2.5 h-7 text-[0.8rem] font-medium transition-all hover:bg-primary/80">
          Add class
        </Link>
      </div>

      {classes && classes.length > 0 ? (
        <div className="space-y-2">
          {classes.map(cls => {
            const open = cls.assignments?.filter(
              (a: { state: string }) => !["submitted", "graded"].includes(a.state)
            ).length ?? 0

            return (
              <Link
                key={cls.id}
                href={`/classes/${cls.id}`}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-stone-100 hover:border-stone-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cls.color }} />
                  <div>
                    <p className="font-medium text-stone-900">{cls.name}</p>
                    {cls.teacher && (
                      <p className="text-xs text-stone-400">{cls.teacher}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {open > 0 && (
                    <span className="text-xs text-stone-500">{open} open</span>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {AI_POLICY_LABELS[cls.ai_policy] ?? cls.ai_policy}
                  </Badge>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-stone-200 p-8 text-center space-y-3">
          <p className="text-stone-600 font-medium">No classes yet</p>
          <p className="text-stone-400 text-sm">Add a class and upload your syllabus so Diana understands the rules.</p>
          <Link href="/classes/new" className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-3 h-8 text-sm font-medium transition-all hover:bg-primary/80">
            Add your first class
          </Link>
        </div>
      )}
    </div>
  )
}
