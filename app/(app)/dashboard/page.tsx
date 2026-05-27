import { createClient } from "@/lib/supabase/server"
import { NextFiveMinutes } from "@/components/dashboard/next-five-minutes"
import { DoneNotSubmitted } from "@/components/dashboard/done-not-submitted"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user!.id)
    .single()

  // "Your next 5 minutes" — overdue + due soon, prioritized
  const { data: urgentAssignments } = await supabase
    .from("assignments")
    .select("*, classes(name, color)")
    .eq("user_id", user!.id)
    .in("state", ["captured", "planned", "in_progress"])
    .not("due_at", "is", null)
    .order("due_at", { ascending: true })
    .limit(5)

  // Done but not submitted — the signature Diana feature
  const { data: doneNotSubmitted } = await supabase
    .from("assignments")
    .select("*, classes(name, color)")
    .eq("user_id", user!.id)
    .eq("state", "done")
    .order("updated_at", { ascending: false })

  const { data: classes } = await supabase
    .from("classes")
    .select("id")
    .eq("user_id", user!.id)

  const firstName = profile?.display_name?.split(" ")[0] ?? "there"
  const hasClasses = classes && classes.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">
          Hey {firstName}.
        </h1>
        <p className="text-stone-500 text-sm mt-0.5">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {!hasClasses && (
        <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center space-y-3">
          <p className="text-stone-600 font-medium">Add your first class to get started</p>
          <p className="text-stone-400 text-sm">Diana learns your rubrics so every AI feature understands your teacher&apos;s rules.</p>
          <Link href="/classes/new" className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-3 h-8 text-sm font-medium transition-all hover:bg-primary/80">
            Add a class
          </Link>
        </div>
      )}

      {doneNotSubmitted && doneNotSubmitted.length > 0 && (
        <DoneNotSubmitted assignments={doneNotSubmitted} />
      )}

      {hasClasses && (
        <NextFiveMinutes assignments={urgentAssignments ?? []} />
      )}
    </div>
  )
}
