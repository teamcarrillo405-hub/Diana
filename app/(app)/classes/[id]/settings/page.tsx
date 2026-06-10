import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { saveClassAiMode } from "./actions";

export default async function ClassAiSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: cls } = await supabase
    .from("classes")
    .select("id, name, ai_mode")
    .eq("id", id)
    .single();
  if (!cls) notFound();

  const currentMode = (cls.ai_mode ?? "green") as "green" | "yellow" | "red";

  async function action(formData: FormData) {
    "use server";
    const aiMode = String(formData.get("aiMode")) as "green" | "yellow" | "red";
    const classId = String(formData.get("classId"));
    await saveClassAiMode({ classId, aiMode });
    redirect(`/classes/${classId}`);
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link
          href={`/classes/${id}`}
          className="text-xs text-muted hover:underline"
        >
          ← Back to {cls.name}
        </Link>
        <h1 className="text-display">AI mode for {cls.name}</h1>
        <p className="text-sm text-muted">
          Choose how Diana uses AI when you work on assignments in this class.
        </p>
      </header>

      <form action={action} className="space-y-4">
        <input type="hidden" name="classId" value={id} />

        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          <label className="flex cursor-pointer items-start gap-4 px-4 py-4 hover:bg-border/30">
            <input
              type="radio"
              name="aiMode"
              value="green"
              defaultChecked={currentMode === "green"}
              className="mt-1 accent-green-600"
            />
            <div>
              <p className="font-medium">Green — allow all AI</p>
              <p className="text-sm text-muted">
                AI features are available for this class.
              </p>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-4 px-4 py-4 hover:bg-border/30">
            <input
              type="radio"
              name="aiMode"
              value="yellow"
              defaultChecked={currentMode === "yellow"}
              className="mt-1 accent-yellow-500"
            />
            <div>
              <p className="font-medium">Yellow — citations only</p>
              <p className="text-sm text-muted">
                Only citation help is available for this class.
              </p>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-4 px-4 py-4 hover:bg-border/30">
            <input
              type="radio"
              name="aiMode"
              value="red"
              defaultChecked={currentMode === "red"}
              className="mt-1"
            />
            <div>
              <p className="font-medium">Red — no AI</p>
              <p className="text-sm text-muted">
                AI features are off for this class. The &ldquo;Help me with this reading&rdquo; button stays hidden.
              </p>
            </div>
          </label>
        </div>

        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Save
        </button>
      </form>
    </div>
  );
}
