import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Nav from "@/components/nav"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single()

  return (
    <div className="min-h-screen bg-stone-50">
      <Nav displayName={profile?.display_name ?? user.email ?? "You"} />
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
