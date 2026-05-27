import { AddReadingForm } from "@/components/reading/add-reading-form"

export default async function NewReadingPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-stone-900">Add a reading</h1>
        <p className="text-stone-500 text-sm mt-0.5">
          Paste the text Diana should prep you on.
        </p>
      </div>
      <AddReadingForm classId={classId} />
    </div>
  )
}
