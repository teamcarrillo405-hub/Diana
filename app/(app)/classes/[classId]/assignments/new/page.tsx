import { NewAssignmentForm } from "@/components/assignments/new-assignment-form"

export default async function NewAssignmentPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-stone-900">Add an assignment</h1>
        <p className="text-stone-500 text-sm mt-0.5">Capture it now, plan it later.</p>
      </div>
      <NewAssignmentForm classId={classId} />
    </div>
  )
}
