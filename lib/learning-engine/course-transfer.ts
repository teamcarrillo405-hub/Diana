import { COURSE_ACTIVITY_VERSION, type CourseActivity, type ActivityMethod } from "./course-activities";
import { expansionActivities, expansionCourses } from "./course-expansion";
import type { CourseMap } from "./course-framework";
import { computingTransferOrigins, computingTransferActivityIds } from "./course-computing";

/** A new context is practice, not independent evidence of mastery or learning gains. */
export const TRANSFER_RELEASE = "diana-course-transfer-v1";
export const transferCourses: CourseMap[] = [];
export const transferActivities: CourseActivity[] = [];
export const transferOrigins: Record<string, string> = { ...computingTransferOrigins };
const source = (id: string, title: string, text: string): CourseActivity["sources"][number] => ({ id, title, text,
  authorship: "diana_authored", instructionRights: "original_practice", trainingPermission: "excluded" });
function add(originId: string, title: string, prompt: string, method: ActivityMethod, hints: [string, string],
  example: CourseActivity["example"], passages: [string, string][] = []) {
  const origin = expansionCourses.find(course => course.id === originId);
  if (!origin) throw new Error("transfer_origin_missing");
  // Separate records preserve the source course hash, including its source mappings.
  const courseId = `${originId}-transfer`, unitId = `${courseId}-unit`;
  const sources = passages.map(([sourceTitle, text], index) => source(`${courseId}-source-${index + 1}`, sourceTitle, text));
  transferCourses.push({ id: courseId, title: `${origin.title}: new context`, subject: origin.subject, level: origin.level,
    revision: 1, units: [{ id: unitId, title, skillIds: [...origin.units[0].skillIds] }],
    sources: sources.map(item => ({ resourceId: item.id, edition: TRANSFER_RELEASE, unitId, locator: `source:${item.id}` })), alignments: [] });
  const activityId = `${COURSE_ACTIVITY_VERSION}:${courseId}:apply`;
  transferOrigins[activityId] = originId;
  transferActivities.push({ id: activityId, courseId, skillId: origin.units[0].skillIds[0], subject: origin.subject, level: origin.level,
    title, prompt, sources, method, hints, example, review: "pending", revision: 1 });
}
function exact(origin: string, title: string, prompt: string, reference: string, hints: [string, string], example: CourseActivity["example"]) {
  add(origin, title, prompt, { kind: "math_exact", specification: { kind: "equivalent_expression", reference, variable: "x" } }, hints, example);
}

exact("math-rational-models", "Compare successive discounts", "A 50-dollar jacket receives a 20% discount, then a further 10% discount on the reduced price. Find its final price in dollars, ignoring tax. Enter only the exact number.", "36",
  ["Each discount acts on the price at that step.", "Multiply 50 by 4/5, then multiply the resulting price by 9/10."],
  { prompt: "Different example: 80 dollars is reduced by 25%, then by another 25%.", steps: ["The first price is 60 dollars.", "The second discount is 15 dollars, leaving 45 dollars."] });
exact("math-algebra-probability", "Condition on a changed group", "A survey records 30 bus riders and 20 cyclists. Twelve bus riders and 8 cyclists travel before 8 a.m. Select uniformly from all surveyed people who travel before 8 a.m. What is the probability the selected person is a cyclist? Give an exact fraction.", "2/5",
  ["The eligible group is early travelers from both transport groups.", "Divide the early cyclists by the total number of early travelers."],
  { prompt: "Different example: 3 of 7 early travelers walk.", steps: ["Conditioning defines a group of 7.", "The walking probability within that group is 3/7."] });
exact("math-polynomial-calculus", "Recover a change from a rate", "A tank's inflow rate is r(t)=3t^2+1 liters per minute for 0<=t<=2, with no outflow. How many liters are added during those two minutes? Enter the exact numeric amount, without units.", "10",
  ["An amount accumulated from a rate is a definite integral.", "Use antiderivative t^3+t and evaluate from 0 to 2."],
  { prompt: "Different example: a constant inflow of 4 liters per minute lasts 3 minutes.", steps: ["Integrate the rate 4 over the interval 0 to 3.", "The added amount is 12 liters, regardless of the initial amount."] });
exact("math-linear-multivariable-models", "Evaluate a transformed expectation", "A random variable X takes values -1 and 3 with probabilities 3/4 and 1/4. A payment is Y=2X+5. Find E[Y] as an exact number.", "5",
  ["Transform each possible value before weighting it, or use linearity of expectation.", "The two possible payments are 3 and 11, with the original probabilities."],
  { prompt: "Different example: X is equally likely 0 or 2, and Y=X+4.", steps: ["The payment values are 4 and 6.", "Their equally weighted mean is 5."] });

const reading = [
  { origin: "reading-narrative-inference", title: "Infer from a new narrator", passages: [
    ["Original scene: rehearsal", "Luis left his trumpet in its case during the first rehearsal. When the conductor asked for a volunteer, he studied the floor. At home that evening he played the opening phrase three times and wrote a reminder to breathe before the long note."],
    ["Original scene: the following rehearsal", "At the next rehearsal, Luis put the trumpet on his chair before the conductor arrived. He asked to try the opening phrase with the group. Afterward he said he wanted to practice the final note again; being ready to try did not mean he thought the piece was finished."]
  ], prompt: "Infer how Luis's willingness to participate changes. Use a distinctive quotation from each scene, and distinguish evidence of willingness from a claim that he has mastered the piece.", criteria: ["Trace a change in visible actions.", "Attribute an exact quotation to each scene.", "Explain the inference without asserting mastery or unreported thoughts."] },
  { origin: "reading-rhetorical-reading", title: "Analyze rhetoric in a new debate", passages: [
    ["Original editorial: a shaded square", "The square should be a resting place, not a frying pan. A three-month shade-canopy trial could help us compare midday use, maintenance and cost. More occupied benches would not by itself prove a citywide health benefit."],
    ["Original visitor account", "I photographed every bench full and called the canopy a success. A gardener later told me it was the annual market day. My photograph showed one lively hour; it did not show the square on ordinary weekdays."]
  ], prompt: "Explain the editorial's figurative contrast and how the visitor's revised account qualifies the evidence for the proposal. Quote both passages and keep a usage claim separate from a health claim.", criteria: ["Explain the function of the figurative contrast.", "Use an attributed quotation from each passage.", "Evaluate the limits of a single event without dismissing the trial proposal."] },
  { origin: "reading-academic-synthesis", title: "Separate an indicator from its construct", passages: [
    ["Original software study abstract", "The pilot counted a document as revised when its saved file changed. Volunteers using a new editor saved more changed files than volunteers using their usual editor. Assignment difficulty and previous editing habits were not measured."],
    ["Original measurement commentary", "A corrected letter and a reorganized argument both create a changed file. Save counts describe software events, not the quality of revision. A claim about improved writing needs a separately defined outcome and attention to who joined each group."]
  ], prompt: "Synthesize a bounded claim about this pilot. Identify its operational definition and use both sources to explain why the measured event is not equivalent to better writing.", criteria: ["State the file-change counting rule.", "Use attributed quotations from both passages.", "Separate recorded activity from writing quality and causal claims."] },
  { origin: "reading-epistemic-reading", title: "Distinguish prediction from identification", passages: [
    ["Original modeling memo", "Two runoff models predict the observed monthly totals equally well. One represents soil storage and the other uses a fitted seasonal curve. The team proposes the curve for short-term forecasts because it is cheaper to run; no storm-scale comparison has been made."],
    ["Original response to the memo", "Similar monthly totals can conceal different storm responses. A practical forecasting choice does not establish the physical mechanism. Before collecting new measurements, compare the models' storm-scale predictions and specify where they diverge under the same input conditions."]
  ], prompt: "Reconstruct the recommendation and its practical warrant. Then propose a discriminating observation using the response. Quote both passages and state what a favorable prediction result would still not establish about mechanism.", criteria: ["Separate cost-based choice from mechanistic identification.", "Attribute evidence to both passages.", "Specify diverging predictions under shared conditions and retain an inference limit."] }
] as const;
for (const item of reading) add(item.origin, item.title, item.prompt, { kind: "reading_evidence", minimumSources: 2, criteria: [...item.criteria] },
  ["Identify the claim each passage can directly support.", "Explain the connection between your quotations; quotation matching alone does not establish an interpretation."],
  { prompt: "Different example: a counter records library entrances while an observer records repeat visits.", steps: ["Entrances and distinct visitors differ.", "Combine the accounts in a claim that retains that distinction."] }, item.passages.map(pair => [...pair]));

const writing = [
  { origin: "english-paragraph-revision", title: "Revise for a new audience", text: "Original school notice record: Eight volunteers tried reusable lunch containers for one week. Six said they would use them again. Two mentioned difficulty carrying them. The trial did not record washing time or ask the other students.", prompt: "Write a short notice for families revising this draft: 'Reusable containers are perfect for every student and take no extra effort.' Include a precise claim, one relevant observation and a limit. Make clear what families can decide from this small trial.", criteria: ["Address families with a clear purpose.", "Replace the universal claim with the recorded group's result.", "Connect evidence to the recommendation and identify an unmeasured cost."] },
  { origin: "english-argument-counterclaim", title: "Integrate a counterclaim", text: "Original discussion record: A club proposes a weekly online meeting. In a survey of 18 current members, 11 favored it and 7 preferred the school room. Three members reported unreliable home internet. No prospective members were surveyed.", prompt: "Write a proposal to the club adviser. Revise 'Online meetings solve access for everyone' into a supported claim. Address the internet-access counterclaim and propose a response without inventing survey results. Distinguish a quotation or paraphrase of the record from your recommendation.", criteria: ["Use the record accurately and attribute borrowed wording or information.", "Address the counterclaim substantively rather than dismissing it.", "Make a qualified recommendation whose proposed outcome is not presented as observed."] },
  { origin: "english-academic-argument", title: "Turn a conclusion into a research question", text: "Original seminar record: Students selected either text reminders or a paper checklist for a two-week project. The reminder group reported more completed tasks. Students chose their own condition and completion was self-reported. Initial workload was not recorded.", prompt: "Revise 'Text reminders cause all students to finish more work' for an academic methods section. Give a bounded claim and a research question with a defined outcome, comparison and way to address one alternative explanation.", criteria: ["Separate the observed association from a causal claim.", "Define an outcome and comparison for the proposed question.", "Connect a design choice to a specific alternative explanation and retain a limit."] },
  { origin: "english-scholarly-revision", title: "Respond to a new review concern", text: "Original study and review record: A classifier was calibrated on 80 archived passages and evaluated on 20 new passages from the same collection. The manuscript calls this broad disciplinary validation. A reviewer notes that both sets use one editor's labels and asks for evidence from another discipline and independent annotation. Those additional tests have not been run.", prompt: "Write a revised claim and a short response to the reviewer. State the exact change to the manuscript, distinguish completed evaluation from proposed work, and explain how a future test would address one review concern. Do not claim the future test succeeded.", criteria: ["Revise the broad claim to match the actual evaluated setting.", "Identify a concrete manuscript change and address the criticism.", "Separate completed evidence, planned tests and unresolved limits."] }
] as const;
for (const item of writing) add(item.origin, item.title, item.prompt, { kind: "writing_revision", criteria: [...item.criteria] },
  ["Mark the words that extend beyond the recorded evidence.", "Make the proposed next step explicit without describing it as a completed result."],
  { prompt: "Different example: a small volunteer trial is described as proof for every school.", steps: ["Name the actual participants and recorded outcome.", "Frame a broader study as a proposal and explain the uncertainty it would address."] }, [["Original writing practice record", item.text]]);

const science = [
  { origin: "science-energy-ecosystems", title: "Compare energy across durations", prompt: "A 4.00 W lamp runs for 15.0 s and a 6.00 W lamp runs for 5.00 s. Using E=P*t, find the first lamp's energy minus the second lamp's energy in J, with three significant figures.", answer: "30.0 J", hints: ["Calculate energy separately for each duration.", "Subtract the second lamp's energy from the first, preserving the requested order."] },
  { origin: "science-mechanics-cell-evidence", title: "Calculate an energy change", prompt: "A 2.00 kg cart accelerates from 1.00 m/s to 3.00 m/s. Using K=(1/2)mv^2, find final kinetic energy minus initial kinetic energy in J, with three significant figures.", answer: "8.00 J", hints: ["Compute the two energies before taking their difference.", "Square each velocity separately; squaring the velocity change gives a different quantity."] },
  { origin: "science-physical-models", title: "Use final volume in dilution", prompt: "A solution contains 0.120 mol of solute in 0.400 L. It is diluted with solvent to a final volume of 0.600 L with no solute lost. Calculate the final concentration in mol/L with three significant figures.", answer: "0.200 mol/L", hints: ["The solute amount remains unchanged.", "Use the final volume, not the volume of solvent added, as the denominator."] },
  { origin: "science-transport-research", title: "Reverse a transport gradient", prompt: "Use J=-D(dc/dx). D=4.00e-9 m^2/s and the gradient is +2.00e3 mol/m^4. Give signed flux J in mol*m^-2*s^-1 with three significant figures. The sign follows this declared one-dimensional coordinate convention.", answer: "-8.00e-6 mol*m^-2*s^-1", hints: ["The model puts a negative sign in front of a positive coefficient and gradient.", "Combine exponents and retain the signed direction in the requested units."] }
] as const;
const scienceExamples: CourseActivity["example"][] = [
  { prompt: "Different example: compare a 2.00 W device running for 3.00 s with a 1.00 W device running for 2.00 s.", steps: ["Their energies are 6.00 J and 2.00 J.", "The first energy minus the second is 4.00 J."] },
  { prompt: "Different example: a 4.00 kg cart slows from 2.00 m/s to 1.00 m/s.", steps: ["Its initial energy is 8.00 J and its final energy is 2.00 J.", "The signed change is 2.00 - 8.00 = -6.00 J."] },
  { prompt: "Different example: 0.0500 mol of solute is diluted from 0.100 L to a final volume of 0.500 L.", steps: ["The solute amount remains 0.0500 mol.", "Final concentration is 0.0500/0.500 = 0.100 mol/L."] },
  { prompt: "Different example: D=1.00e-9 m^2/s and dc/dx=-2.00e3 mol/m^4 in J=-D(dc/dx).", steps: ["The negative model sign and negative gradient produce positive flux.", "J=2.00e-6 mol*m^-2*s^-1 in this coordinate convention."] },
];
science.forEach((item, index) => add(item.origin, item.title, item.prompt, { kind: "science_dimensions", expected: item.answer, significantFigures: 3 }, [...item.hints], scienceExamples[index]));

const history = [
  { origin: "history-chronology-perspective", title: "Order records from a new setting", sources: [
    ["Original simulation: market notice, 1874", "Authored historical simulation, not an authentic archival document. A council notice dated June 3, 1874 announces a Saturday market beginning June 13. It records the council's plan and approved location, not how many sellers actually arrived."],
    ["Original simulation: trader's letter, 1881", "Authored historical simulation, not an authentic archival document. In an 1881 letter a trader remembered selling at the first summer market, but wrote that heavy rain reduced visits during later weeks. The letter gives one trader's recollection, not a dated attendance ledger."]
  ], prompt: "Construct a timeline distinguishing the announcement, planned opening and later recollection. Quote both sources and explain which event is planned versus recalled, plus what would help establish actual attendance." },
  { origin: "history-institutional-change", title: "Evaluate a new access claim", sources: [
    ["Original simulation: clinic committee report, 1921", "Authored historical simulation, not an authentic archival document. A committee counted 240 appointment bookings after extending clinic hours in 1921. Its annual funding report called the change universal access. It recorded neither completed visits nor the addresses of people unable to book."],
    ["Original simulation: factory worker's diary, 1921", "Authored historical simulation, not an authentic archival document. A worker wrote that the later closing time helped on some days, but a supervisor sometimes refused an early departure. The diary describes that person's circumstances, not every worker's schedule."]
  ], prompt: "Assess the committee's universal-access claim using purpose, measurement and the worker's perspective. Quote both sources and identify a missing group and a record that could help investigate its experience." },
  { origin: "history-historical-arguments", title: "Compare new institutional categories", sources: [
    ["Original simulation: port register, 1906", "Authored historical simulation, not an authentic archival document. The port register counted licensed cargo vessels entering the harbor in 1906. Small unlicensed boats were outside its rules. Repeated entries by the same vessel were recorded as separate arrivals."],
    ["Original simulation: fishers' association notes, 1907", "Authored historical simulation, not an authentic archival document. Association volunteers listed members requesting repair assistance in 1907. Only members who applied appear, and some shared one boat. The list did not identify every working vessel in the harbor."]
  ], prompt: "Develop a bounded claim about what each institution's record reveals. Quote both sources and explain why their totals cannot be added as a count of distinct boats without resolving units, repeated entries, membership and dates." },
  { origin: "history-historiography-methods", title: "Test a comparative explanation", sources: [
    ["Original simulation: historian of petitions", "Authored historiographical simulation, not a published historical argument. Historian A explains a rise in petitions in two towns by a new council rule. One town began counting each signature as an entry during the same year; the other continued counting complete documents."],
    ["Original simulation: historian of associations", "Authored historiographical simulation, not a published historical argument. Historian B emphasizes neighborhood associations whose surviving minutes discuss petition campaigns. Most surviving minutes come from one wealthy district. B proposes recoding both towns by document and tracing organizers before comparing explanations."]
  ], prompt: "Compare the rule-change and organizing explanations using quotations from both sources. Specify a consistent unit, a strategy for the uneven archival survival and evidence that could distinguish their predictions while allowing both mechanisms to contribute." }
] as const;
for (const item of history) add(item.origin, item.title, item.prompt, { kind: "history_sources", minimumSources: 2,
  criteria: ["Identify source dates, purposes and author positions.", "Attribute an exact quotation to each source.", "Explain a specific inference limit and evidence that could address it without inventing a historical result."] },
  ["List the unit each record counts and the people or events it leaves out.", "Connect the proposed additional source to the precise claim being tested."],
  { prompt: "Different example: a hall counts bookings and a diary describes one gathering.", steps: ["A booking is not evidence that every scheduled gathering occurred.", "The diary offers a perspective, not a complete attendance register."] }, item.sources.map(pair => [...pair]));

/** Each changed context practices a specific original task, not every concept in its collection.
 * These navigation links are separate from immutable activity/course content.
 */
const transferOriginTasks: Readonly<Record<string, string>> = {
  "math-rational-models": "percent", // A discount becomes successive discounts.
  "math-algebra-probability": "conditional", // The conditioned group changes.
  "math-polynomial-calculus": "integral", // A definite integral becomes accumulated inflow.
  "math-linear-multivariable-models": "expectation", // An expectation follows a linear transformation.
  "reading-narrative-inference": "infer", // Infer changing participation from visible actions.
  "reading-rhetorical-reading": "rhetoric", // A new figurative proposal and qualifying account.
  "reading-academic-synthesis": "operational", // Distinguish another indicator from its construct.
  "reading-epistemic-reading": "warrant", // Reconstruct a new prediction-versus-mechanism warrant.
  "english-paragraph-revision": "revision-2", // Revise for a changed audience.
  "english-argument-counterclaim": "revision-1", // Address a new access counterclaim.
  "english-academic-argument": "revision-2", // Define a research question from an overbroad conclusion.
  "english-scholarly-revision": "revision-1", // Respond to a new reviewer with completed/planned work separated.
  "science-energy-ecosystems": "energy", // Compare modeled energy over two durations.
  "science-mechanics-cell-evidence": "kinetic", // Calculate the change between two kinetic energies.
  "science-physical-models": "concentration", // Recalculate concentration after dilution.
  "science-transport-research": "diffusive-flux", // Reverse the signed gradient in the same model.
  "history-chronology-perspective": "analysis-1", // Sequence a planned event and later recollection.
  "history-institutional-change": "analysis-1", // Evaluate a new universal-access claim.
  "history-historical-arguments": "analysis-2", // Resolve incompatible units before comparing counts.
  "history-historiography-methods": "analysis-2", // Design a new comparison with consistent units and rival explanations.
};
export const transferOriginActivityIds: Readonly<Record<string, string>> = Object.freeze({ ...computingTransferActivityIds, ...Object.fromEntries(
  transferActivities.map(target => {
    const originCourse = transferOrigins[target.id];
    const originId = `${COURSE_ACTIVITY_VERSION}:${originCourse}:${transferOriginTasks[originCourse]}`;
    const origin = expansionActivities.find(item => item.id === originId);
    if (!origin || origin.courseId !== originCourse || origin.skillId !== target.skillId || origin.subject !== target.subject
      || origin.level !== target.level || origin.method.kind !== target.method.kind) throw new Error("transfer_activity_mapping_mismatch");
    return [target.id, originId];
  }),
)});
