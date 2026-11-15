/** Keep actual problem content ahead of longer tutor metadata and directions. */
export function assignmentStudySource(
  problems: Array<{ problem_number: number; problem_text: string }>,
  context: string,
): string {
  const problemText = problems.slice(0, 30)
    .filter(problem => problem.problem_text.trim())
    .map(problem => `Problem ${problem.problem_number}: ${problem.problem_text.trim().slice(0, 1500)}`)
    .join("\n\n")
    .slice(0, 6000);
  return [
    problemText ? `Assignment problems (practice the underlying subject skills):\n${problemText}` : "",
    context,
  ].filter(Boolean).join("\n\n").slice(0, 10000);
}
