import { NewClassForm } from "@/components/classes/new-class-form"

export default function NewClassPage() {
  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-stone-900">Add a class</h1>
        <p className="text-stone-500 text-sm mt-0.5">
          Add your teacher&apos;s name and rubric so Diana knows the rules for this class.
        </p>
      </div>
      <NewClassForm />
    </div>
  )
}
