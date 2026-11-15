import { COURSE_ACTIVITY_VERSION, type CourseActivity, type ActivityMethod } from "./course-activities";
import type { CourseMap } from "./course-framework";

/** Original prerequisite practice. Existing skills and course versions stay unchanged. */
export const foundationCourses: CourseMap[] = [
  { id: "math-polynomial-foundations", title: "Polynomial structure foundations", subject: "math", level: "high_school", revision: 1,
    units: [{ id: "math-polynomial-foundations-unit", title: "Distribution and like terms", skillIds: ["math.polynomials"] }], sources: [], alignments: [] },
  { id: "reading-evidence-foundations", title: "Evidence and interpretation foundations", subject: "reading", level: "middle_school", revision: 1,
    units: [{ id: "reading-evidence-foundations-unit", title: "Evidence, summary, argument and comparison",
      skillIds: ["reading.evidence", "reading.central_idea", "reading.argument", "reading.comparison"] }], sources: [], alignments: [] },
];
export const foundationActivities: CourseActivity[] = [];
function add(courseId: string, key: string, skillId: string, title: string, prompt: string, method: ActivityMethod,
  hints: [string, string], example: CourseActivity["example"], passages: [string, string][] = []) {
  const course = foundationCourses.find(item => item.id === courseId)!;
  const sources: CourseActivity["sources"] = passages.map(([sourceTitle, text], index) => ({
    id: `${courseId}-${key}-source-${index + 1}`, title: sourceTitle, text, authorship: "diana_authored",
    instructionRights: "original_practice", trainingPermission: "excluded",
  }));
  foundationActivities.push({ id: `${COURSE_ACTIVITY_VERSION}:${courseId}:${key}`, courseId, skillId, subject: course.subject,
    level: course.level, title, prompt, method, hints, example, sources, review: "pending", revision: 1 });
  for (const source of sources) course.sources.push({ resourceId: source.id, edition: "Diana prerequisite practice 1",
    unitId: course.units[0].id, locator: `source:${source.id}` });
}

add("math-polynomial-foundations", "distribute", "math.polynomials", "Combine the linear terms",
  "Use distribution on (2x + 3)(x - 4), then combine like terms. What is the coefficient of x in the resulting polynomial? Enter only the exact numeric coefficient. This check evaluates the coefficient; it does not verify every step of your expansion.",
  { kind: "math_exact", specification: { kind: "equivalent_expression", reference: "-5", variable: "x" } },
  ["Distribute each term of the first factor across both terms of the second factor.", "The terms containing exactly one x are -8x and 3x. Add their coefficients, keeping the signs."],
  { prompt: "Different example: find the coefficient of x in (3x + 2)(x + 1).", steps: ["Distribution gives 3x^2 + 3x + 2x + 2.", "The linear terms combine to 5x, so their coefficient is 5."] });

add("reading-evidence-foundations", "evidence", "reading.evidence", "Connect a detail to a claim",
  "Support the claim that Jo changed the plan after checking the trail. Include a short exact quotation from the passage and explain how it connects the observation to the decision. Do not claim that the passage establishes the safety of every route.",
  { kind: "reading_evidence", minimumSources: 1, criteria: ["Select a relevant exact detail from the passage.", "Explain how the detail supports the stated claim.", "Keep the explanation within what this passage establishes."] },
  ["Find the observation and the decision that follows it.", "After quoting, explain the connection in your own words; the quotation alone does not make the reasoning explicit."],
  { prompt: "Different example: a cook notices an empty flour jar and chooses a rice dish.", steps: ["Quote the detail about the empty jar.", "Explain that the missing ingredient led to a change in the planned meal."] },
  [["Original passage: the walking plan", "Jo planned to walk the ridge trail before lunch. At the trail noticeboard, Jo read that a fallen tree blocked the path beyond the first turn. Jo folded the ridge map and chose the short lakeside loop instead. The passage records that decision; it does not describe conditions along every nearby route."]]);

add("reading-evidence-foundations", "central-idea", "reading.central_idea", "Summarize at the right scope",
  "State the passage's central idea in one or two sentences. Include a short exact quotation and explain how two details support your summary. Keep the summary about this group's process rather than claiming that every repair attempt succeeds.",
  { kind: "reading_evidence", minimumSources: 1, criteria: ["State a central idea that covers the whole passage at an appropriate scope.", "Select an exact quotation and connect two representative details to the summary.", "Distinguish the group's recorded process from a universal conclusion."] },
  ["Look for the connection between the first attempt, the discussion and the later change.", "A useful summary includes the process across the passage, not just the final object."],
  { prompt: "Different example: a choir records a rehearsal, listens for a timing issue and changes its entrance cue.", steps: ["Summarize how the choir used a recording to guide a specific revision.", "Support that idea with both listening to the recording and changing the cue."] },
  [["Original passage: repairing the cart", "The workshop group first replaced a squeaking wheel, but the cart still pulled to one side. They compared notes from each test instead of repeating the same repair. A student noticed that the load had been placed unevenly. The group centered the boxes and recorded how the next trial differed. They kept both the earlier notes and the new result so another group could examine the change."]]);

add("reading-evidence-foundations", "argument", "reading.argument", "Identify a claim and its support",
  "Identify the writer's proposal, one supporting reason and a limitation the writer acknowledges. Include a short exact quotation and explain how the evidence supports a trial without proving that the proposal works for all students.",
  { kind: "reading_evidence", minimumSources: 1, criteria: ["Distinguish the proposed action from its supporting observation.", "Use an exact quotation and explain how it relates to the proposal.", "Identify an acknowledged limitation and retain the claim's scope."] },
  ["A proposal says what should be tried; an observation describes what was recorded.", "Find the sentence limiting whose needs the recorded requests represent."],
  { prompt: "Different example: a librarian proposes a weekend trial after five visitors request different hours.", steps: ["The requests support investigating a need among those visitors.", "They do not establish a preference shared by every library user."] },
  [["Original passage: borrowing umbrellas", "Our student council should try an umbrella-loan stand for one month. Last week, nine students asked the office to borrow an umbrella during rain. Those requests suggest a need worth investigating, but they do not tell us how many other students would use a stand. During a trial, we could record loans, returns and replacement costs before deciding whether to continue."]]);

add("reading-evidence-foundations", "comparison", "reading.comparison", "Compare on one shared question",
  "Compare what the two passages can tell us about using the music room at lunch. Choose a shared comparison point, quote each passage and explain one agreement and one difference. Do not treat visits and distinct students as the same count.",
  { kind: "reading_evidence", minimumSources: 2, criteria: ["Use one shared dimension to compare the two sources.", "Attribute an exact quotation to each passage.", "Explain an agreement and a difference while distinguishing visits from distinct students."] },
  ["Both passages concern lunchtime access, but they record different things.", "Compare how much each source can establish about who uses the room."],
  { prompt: "Different example: a museum counter records entries while an interview describes one family's visit.", steps: ["Compare both on what they establish about access.", "The count measures entries; the interview adds one perspective without representing all visitors."] },
  [["Original log: music room visits", "The music room's door counter recorded 36 lunchtime entries during three days. The counter did not identify students or record how long they stayed. A student who left and returned could produce two entries."],
    ["Original account: a drummer's lunch break", "I used the music room twice at lunch to practice quietly with headphones. On one day I went back after returning a borrowed cable. I appreciated having a place to practice, but I do not know how many other students used it."]]);
