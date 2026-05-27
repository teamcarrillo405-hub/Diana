"use client"

import { Badge } from "@/components/ui/badge"

type Summary = {
  assignment_types: string[]
  citation_style: string | null
  show_work_required: boolean
  mechanics_weight: string | null
  ai_policy_hint: string | null
  key_rules: string[]
}

export function RubricSummary({ summary }: { summary: Summary }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">
          Rubric summary
        </h3>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-stone-500">Assignment types</p>
        {summary.assignment_types.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {summary.assignment_types.map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-400 italic">Not specified</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-stone-500">Citation style</p>
          <p className="text-sm text-stone-800">
            {summary.citation_style ?? (
              <span className="text-stone-400 italic">Not specified</span>
            )}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-stone-500">Show work</p>
          <p className="text-sm text-stone-800">
            {summary.show_work_required ? "Required" : "Not mentioned"}
          </p>
        </div>
      </div>

      {summary.mechanics_weight && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-stone-500">Mechanics weight</p>
          <p className="text-sm text-stone-800">{summary.mechanics_weight}</p>
        </div>
      )}

      {summary.ai_policy_hint && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-1">
            AI policy
          </p>
          <p className="text-sm text-amber-900">{summary.ai_policy_hint}</p>
        </div>
      )}

      {summary.key_rules.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-stone-500">Key rules</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-stone-800 marker:text-stone-400">
            {summary.key_rules.map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
