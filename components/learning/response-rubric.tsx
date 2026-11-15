import type { ResponseRubric as Rubric } from "@/lib/learning-engine/response-rubric";

export function ResponseRubric({ rubric }: { rubric: Rubric | null | undefined }) {
  if (!rubric) return null;
  return <details><summary>Review guide</summary>
    <p>Use these criteria to revise. An educator can assess your reasoning; the automatic check does not assign a quality grade.</p>
    {rubric.criteria.map(criterion => <section key={criterion.id}><h3>{criterion.title}</h3><p>{criterion.descriptors[3]}</p></section>)}
    <p>Different interpretations can be supported. Spelling, dialect, response length and the number of quotes do not determine a reasoning score.</p>
  </details>;
}
