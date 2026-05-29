import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CaptureForm } from "./capture-form";

export default async function QuickAddPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Quick add</h1>
        <p className="text-sm text-muted">What do you need to remember?</p>
      </header>
      <CaptureForm />
    </div>
  );
}
