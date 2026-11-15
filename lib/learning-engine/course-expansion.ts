import { COURSE_ACTIVITY_VERSION, type ActivityMethod, type CourseActivity } from "./course-activities";
import type { Competency, CourseLevel, CourseMap, LearningDomain } from "./course-framework";

/** Content release, not an engine change. Existing exercise identities and hashes stay intact. */
export const AUTHORED_CURRICULUM_RELEASE = "diana-authored-curriculum-v3";
export const expansionCompetencies: Competency[] = [];
export const expansionCourses: CourseMap[] = [];
export const expansionActivities: CourseActivity[] = [];

const source = (id: string, title: string, text: string): CourseActivity["sources"][number] => ({
  id, title, text, authorship: "diana_authored", instructionRights: "original_practice", trainingPermission: "excluded",
});
function collection(subject: LearningDomain, level: CourseLevel, key: string, title: string, objective: string, prerequisites: string[] = []) {
  const skillId = `${subject}.${key}`, courseId = `${subject}-${key.replaceAll("_", "-")}`;
  expansionCompetencies.push({ id: skillId, subject, title, objective, prerequisites, levels: [level], revision: 1 });
  const course: CourseMap = { id: courseId, title, subject, level, revision: 1,
    units: [{ id: `${courseId}-unit`, title, skillIds: [skillId] }], sources: [], alignments: [] };
  expansionCourses.push(course);
  return { course, skillId };
}
type Collection = ReturnType<typeof collection>;
function task(parent: Collection, key: string, title: string, prompt: string, method: ActivityMethod,
  hints: [string, string], example: CourseActivity["example"], sources: CourseActivity["sources"] = []) {
  const { course, skillId } = parent;
  expansionActivities.push({ id: `${COURSE_ACTIVITY_VERSION}:${course.id}:${key}`, courseId: course.id, skillId,
    subject: course.subject, level: course.level, title, prompt, method, hints, example, sources, review: "pending", revision: 1 });
  for (const item of sources) if (!course.sources.some(entry => entry.resourceId === item.id)) {
    course.sources.push({ resourceId: item.id, edition: AUTHORED_CURRICULUM_RELEASE, unitId: course.units[0].id, locator: `source:${item.id}` });
  }
}
function exact(parent: Collection, key: string, title: string, prompt: string, reference: string,
  hints: [string, string], example: CourseActivity["example"]) {
  task(parent, key, title, prompt, { kind: "math_exact", specification: { kind: "equivalent_expression", reference, variable: "x" } }, hints, example);
}

const rational = collection("math", "middle_school", "rational_models", "Percent, signed numbers and probability",
  "Calculate a percent of a stated amount, combine signed rational numbers, and calculate probability in a finite equally likely model.", ["math.ratio_foundations"]);
exact(rational, "percent", "Find a sale price", "A notebook costs 24 dollars before a 25% discount. Find the sale price in dollars. Enter only the number; ignore tax.", "18",
  ["The discount is a fraction of the original price, not the final price.", "Find one quarter of 24, then subtract that amount from 24."],
  { prompt: "Different example: a 40-dollar bag has a 10% discount.", steps: ["The discount is 4 dollars.", "The price after the discount is 40 - 4 = 36 dollars."] });
exact(rational, "signed", "Combine signed changes", "A water-level reading starts at -3/2 meters relative to a marker, rises by 5/4 meters, then falls by 1/2 meter. Give its final signed reading as an exact number, without units.", "-3/4",
  ["A rise adds to the signed reading; a fall subtracts from it.", "Express all three fractions with denominator 4 before combining them."],
  { prompt: "Different example: start at -2, rise by 3/2, then fall by 1/2.", steps: ["Calculate -2 + 3/2 - 1/2.", "The final signed value is -1."] });
exact(rational, "finite-probability", "Count equally likely outcomes", "A fair six-sided die has faces 1 through 6. What is the probability of rolling a number greater than 4? Give an exact fraction.", "1/3",
  ["List the faces that satisfy greater than 4.", "Divide the number of favorable faces by the six equally likely faces."],
  { prompt: "Different example: draw uniformly from cards marked A, B, C, D.", steps: ["Two of the four cards are A or B.", "Their probability is 2/4 = 1/2."] });

const algebra = collection("math", "high_school", "algebra_probability", "Polynomial reasoning and conditional probability",
  "Calculate a polynomial product's constant term, evaluate polynomial models, and compute conditional probability from a fully stated finite table.", ["math.polynomials", "math.ratio_foundations"]);
exact(algebra, "expand", "Find a product's constant term", "For the polynomial (x + 3)(x - 2), find the constant term after expansion. Enter only its exact numeric value.", "-6",
  ["The constant term contains no x. Identify which pair of terms produces it.", "Multiply the constant terms from the two factors, keeping their signs."],
  { prompt: "Different example: find the constant term of (x + 1)(x + 4).", steps: ["The constant product is 1*4.", "The constant term is 4; terms containing x do not contribute to it."] });
exact(algebra, "average-change", "Find average rate of change", "For f(x) = x^2 + 2x, find the average rate of change from x = 1 to x = 4. Give an exact number.", "7",
  ["Evaluate f at both endpoints before subtracting.", "Use (f(4) - f(1))/(4 - 1), with the same order in numerator and denominator."],
  { prompt: "Different example: g(x)=x^2 from x=0 to x=2.", steps: ["The output change is 4 - 0 = 4.", "Divide by the input change 2 - 0 to get 2."] });
exact(algebra, "conditional", "Condition on a subgroup", "A club has 12 members who cycle and 8 who do not. Of the cyclists, 9 wear helmets; of the others, 2 own helmets. A member is selected uniformly from the cyclists. What is the probability that this member wears a helmet? Give an exact fraction.", "3/4",
  ["The selection is restricted to cyclists, so use that group as the denominator.", "Only the 9 helmet-wearing cyclists among 12 cyclists are relevant to this conditional question."],
  { prompt: "Different example: 6 of 10 swimmers use goggles; select only from swimmers.", steps: ["The conditioned group has 10 members.", "The probability is 6/10 = 3/5."] });

const calculus = collection("math", "college_intro", "polynomial_calculus", "Polynomial derivatives and integrals",
  "Differentiate a stated polynomial, evaluate its derivative, and evaluate a definite polynomial integral. Final expressions are checked; derivations and proofs require review.", ["math.polynomials", "math.functions"]);
exact(calculus, "derivative", "Differentiate a polynomial", "Find the derivative of f(x) = 3x^4 - 2x^2 + 5x - 7. Enter a polynomial in x.", "12x^3-4x+5",
  ["For each nonconstant term ax^n, use anx^(n-1).", "Differentiate each term separately. The derivative of the constant term is zero."],
  { prompt: "Different example: differentiate 2x^3 + 4x - 9.", steps: ["The power rule gives 6x^2 for the first term.", "The full derivative is 6x^2 + 4."] });
exact(calculus, "tangent-slope", "Evaluate an instantaneous slope", "For f(x) = x^3 - 2x, find the slope of the tangent at x = 2. Enter an exact number.", "10",
  ["A tangent slope is the derivative evaluated at the input.", "Find f'(x) first, then substitute x = 2."],
  { prompt: "Different example: find the slope of g(x)=x^2 at x=3.", steps: ["The derivative is 2x.", "Its value at 3 is 6."] });
exact(calculus, "integral", "Evaluate a definite integral", "Evaluate the definite integral of 3x^2 + 2 from x = 0 to x = 2. Give an exact number.", "12",
  ["An antiderivative is x^3 + 2x.", "Evaluate the antiderivative at the upper bound and subtract its value at the lower bound."],
  { prompt: "Different example: integrate 2x from 1 to 3.", steps: ["An antiderivative is x^2.", "The definite integral is 3^2 - 1^2 = 8."] });

const advancedMath = collection("math", "college_advanced", "linear_multivariable_models", "Linear algebra and multivariable calculations",
  "Calculate a three-by-three determinant, a partial derivative of a bivariate polynomial at a point, and a finite expected value. These selected calculations do not cover a full advanced mathematics course.", ["math.polynomials", "math.ratio_foundations"]);
exact(advancedMath, "determinant", "Calculate a determinant", "Find the determinant of the matrix whose rows are (2, 1, 0), (0, 3, 1), (1, 0, 4). Give an exact number.", "25",
  ["Expand along the first row and keep the alternating signs.", "Use 2(3*4 - 1*0) - 1(0*4 - 1*1)."],
  { prompt: "Different example: the determinant of rows (3, 1), (2, 4).", steps: ["Compute the diagonal products 3*4 and 1*2.", "Subtract to get 10."] });
exact(advancedMath, "partial", "Evaluate a partial derivative", "Let f(x,y) = x^2*y + 3x*y^2. Find the partial derivative with respect to x at (x,y) = (2,1). Enter an exact number.", "7",
  ["While differentiating with respect to x, treat y as a constant.", "The partial derivative is 2xy + 3y^2. Substitute the stated point afterward."],
  { prompt: "Different example: for g(x,y)=x*y^2, evaluate the x partial derivative at (3,2).", steps: ["The x partial derivative is y^2.", "At y=2 the result is 4."] });
exact(advancedMath, "expectation", "Calculate a finite expectation", "A discrete random variable X takes values -2, 1 and 4 with probabilities 1/4, 1/2 and 1/4 respectively. Find E[X] as an exact number.", "1",
  ["Multiply each possible value by its probability.", "Sum all three weighted values, including the negative contribution."],
  { prompt: "Different example: X is 0 with probability 1/3 and 3 with probability 2/3.", steps: ["Weight each value: 0*(1/3) and 3*(2/3).", "Their sum is 2; it need not be a possible observed value."] });

type TextCase = { level: CourseLevel; key: string; title: string; objective: string; passages: [string, string];
  sourceTitles: [string, string]; tasks: [string, string, string[], [string, string]][] };
const readingCases: TextCase[] = [
  { level: "middle_school", key: "narrative_inference", title: "Narrative inference and word meaning",
    objective: "Support an inference about a narrator and interpret a word in its immediate textual context.", sourceTitles: ["Original story: the model bridge", "Original story: the next morning"],
    passages: ["Nora held her model bridge under the desk while the others unpacked theirs. One paper support had bent on the bus. When Amir asked to see it, she said she was still checking the design. At recess she tested three folds with scrap paper, then carried the bridge to Amir's table.", "The next morning, Nora put the repaired model at the front of her desk. She called the first support fragile: it had bent under the same coin that the new folded support held. She asked Amir to test the bridge again because one successful trial was not enough to make her certain."],
    tasks: [["infer", "What can you infer about Nora's changing willingness to share her work? Use a detail from each passage and distinguish the narrator's words from your inference.", ["Describe a change in Nora's actions.", "Quote a distinctive detail from each passage.", "Explain the inference without claiming direct access to Nora's thoughts."], ["Track where Nora places the bridge in each passage.", "Explain what the change in actions suggests, while recognizing another interpretation is possible."]],
      ["context", "What does fragile mean in this story? Use a quotation about the bent support from the first passage and a quotation about the test from the second. Explain why fragile does not describe every version of the bridge.", ["Give a context-appropriate meaning.", "Use a distinctive quotation from each passage to compare the original and repaired supports.", "Limit the description to the version supported by the text."], ["Find what happened to the first support under a coin.", "Compare the bent support on the bus with the later test before generalizing."]]] },
  { level: "high_school", key: "rhetorical_reading", title: "Rhetoric and narrative reliability",
    objective: "Analyze how rhetorical choices and narrator access affect an interpretation, using the supplied original passages.", sourceTitles: ["Original editorial: a night library", "Original first-person account"],
    passages: ["A city that calls education a shared priority should leave a door open after the workday ends. A later library closing time would offer that door. The proposal deserves a six-week trial, with staffing costs and evening attendance reported publicly. Calling the trial a guarantee of higher graduation rates would promise more than its measurements could show.", "I saw the reading room full on Friday and thought the debate was settled. Later I learned that the room hosted a one-time poetry event. I had counted occupied chairs, not regular visitors, and I had not asked the staff what keeping the building open required."],
    tasks: [["rhetoric", "Analyze how the editorial combines a metaphor with a limited proposal. Explain what the open door image contributes, and how the first-person account illustrates a limit of attendance evidence.", ["Identify the metaphor in context.", "Explain its persuasive function with quoted evidence.", "Use the first-person account to examine the editorial's evidentiary limit."], ["Compare the figurative door with the concrete proposed trial.", "Connect the narrator's revised conclusion to the editorial's caution about measuring outcomes."]],
      ["reliability", "How does the first-person account revise its initial conclusion? Compare it with the editorial's caution and use evidence from both passages.", ["Identify the narrator's initial claim and later revision.", "Use a distinctive quotation from both passages.", "Explain how limited observation affects the conclusion."], ["List what the narrator counted and what was missing.", "Connect that information limit to the editorial's proposed reporting."]]] },
  { level: "college_intro", key: "academic_synthesis", title: "Academic synthesis and operational definitions",
    objective: "Synthesize a bounded claim across sources and distinguish an operational measure from the construct it is intended to represent.", sourceTitles: ["Original methods note", "Original commentary on measurement"],
    passages: ["The campus pilot defined participation as one recorded contribution during a seminar. Twenty volunteers attended a moderated session and twenty attended an unmoderated session. Moderated sessions produced more recorded contributions. The groups were formed by schedule availability, and the record did not classify contributions by length, accuracy or engagement with others' ideas.", "Counting contributions can make one aspect of classroom activity visible, but it does not make participation and learning interchangeable. A brief question and a detailed explanation may each count as one. To examine learning, researchers need an additional outcome and a design that addresses how students entered each group."],
    tasks: [["synthesize", "Write a bounded synthesis of what the pilot suggests and what the commentary qualifies. Use quotations from both sources without treating either source as proof of a learning effect.", ["State a claim supported by both sources.", "Attribute evidence to each passage.", "Retain the distinction between participation counts and learning."], ["Identify a point of agreement and the commentary's qualification.", "Combine the claims without extending the observed outcome."]],
      ["operational", "Explain the pilot's operational definition of participation. Identify two different contributions that would receive the same count and discuss what that equivalence leaves unmeasured.", ["Identify the exact counting rule.", "Use the contrast offered by the commentary.", "Explain a measurement limit without dismissing the count as useless."], ["Separate the term participation from the rule used to count it.", "Discuss what can and cannot be inferred when different contributions share the same score."]]] },
  { level: "college_advanced", key: "epistemic_reading", title: "Argument reconstruction and epistemic limits",
    objective: "Reconstruct an argument's warrant and evaluate underdetermination using two supplied research-method passages. Disciplinary expertise and full literature review remain outside this exercise.", sourceTitles: ["Original position on model selection", "Original response on identification"],
    passages: ["Two models fit the archived measurements equally well. The first uses fewer adjustable parameters, so the analyst recommends it for the next prediction task. The recommendation assumes that lower complexity will generalize more reliably under the intended conditions. No measurements from the next setting have yet been observed.", "Equal fit to existing observations does not identify a unique generating mechanism. Preferring a simpler model may be a useful decision rule, but the rule and its success must be evaluated separately. A discriminating test should seek observations for which the competing models make different predictions, while stating the conditions under which those predictions were derived."],
    tasks: [["warrant", "Reconstruct the first passage's claim, evidence and unstated dependency. Then use the response to distinguish a decision rule from an established account of the mechanism.", ["Separate fit evidence from the recommendation.", "State the assumption connecting complexity to future performance.", "Use both sources to distinguish prediction choice from mechanistic identification."], ["Ask which step moves beyond already observed measurements.", "Explain why a useful selection rule need not identify the true mechanism."]],
      ["discriminating-test", "Describe what would make a proposed new observation discriminating between these models. Explain why collecting more observations on which they agree would not resolve their disagreement.", ["Identify the need for diverging predictions.", "State relevant test conditions rather than promising universal resolution.", "Use quoted evidence and acknowledge what the proposed test would leave open."], ["Compare predictions, not just the size of the existing dataset.", "The response requires both different predictions and declared conditions."]]] },
];
for (const item of readingCases) {
  const parent = collection("reading", item.level, item.key, item.title, item.objective, ["reading.evidence"]);
  const sources = item.passages.map((text, index) => source(`${parent.course.id}-source-${index + 1}`, item.sourceTitles[index], text));
  for (const [key, prompt, criteria, hints] of item.tasks) task(parent, key, key === item.tasks[0][0] ? "Build a supported interpretation" : "Examine the text closely", `${prompt} Include a distinctive quotation from each passage in your explanation.`,
    { kind: "reading_evidence", minimumSources: 2, criteria }, hints,
    { prompt: "Different example: one report counts books borrowed; another distinguishes borrowing from reading.", steps: ["Attribute the observable count to the first report.", "Use the second report to explain why that count alone does not establish reading or understanding."] }, sources);
}

const englishCases = [
  { level: "middle_school", key: "paragraph_revision", title: "Paragraph purpose and revision", objective: "Revise a short paragraph for a stated audience with a precise claim, relevant support and clear connections.",
    text: "Original draft for a student council note: Everyone needs a silent lunchroom. My two friends said lunch was loud yesterday. A quiet table could help people who want a calmer place. We should close all conversation immediately.",
    prompts: ["Revise the draft as a respectful proposal to student council. Keep the useful idea, match the claim to the evidence, and identify what student feedback you would collect.", "Rewrite the proposal for a brief announcement to classmates. Explain your change in audience, organize the key action clearly, and avoid claiming that two friends represent everyone."],
    criteria: ["State a specific, supportable proposal.", "Use the reported evidence without enlarging its sample.", "Choose a structure and tone suited to the stated audience.", "Explain one deliberate revision."] },
  { level: "high_school", key: "argument_counterclaim", title: "Argument, counterclaim and source integration", objective: "Integrate source material with a counterclaim and distinguish quotation, paraphrase and the writer's reasoning.",
    text: "Original briefing: A school proposes a voluntary repair workshop. Twenty students answered an interest form; sixteen wanted to attend. The form did not record who could stay after school. Facilities staff require trained supervision and a separate approval before any electrical equipment is opened.",
    prompts: ["Write a recommendation about a pilot repair workshop for the school principal. Address both student interest and the supervision/access constraints. Include a reasonable counterclaim and a response supported by the briefing.", "Revise this sentence into a supported paragraph: 'The briefing proves all students want to repair anything after school.' Integrate one exact quotation, one attributed paraphrase, and your own reasoning without merging their roles."],
    criteria: ["Limit the claim to the evidence and proposed scope.", "Integrate attributed support rather than dropping in a quotation.", "Address a material counterclaim or condition.", "Keep source statements distinct from your recommendation."] },
  { level: "college_intro", key: "academic_argument", title: "Academic argument and research questions", objective: "Write a qualified academic claim and transform an overbroad conclusion into an investigable question with defined evidence.",
    text: "Original research summary: Thirty volunteers logged their study breaks for one week. Those reporting outdoor breaks also reported better mood. The survey did not randomly assign break locations, measure prior mood or assess course performance. It is a description of this volunteer sample, not a test of whether outdoor breaks improve grades.",
    prompts: ["Draft a short academic discussion paragraph using the summary. Explain the observed association, a plausible alternative explanation, and one limitation without making a causal or grade-improvement claim.", "Replace 'Outdoor breaks make every student learn better' with a precise research question and a paragraph describing what evidence would answer it. Define the outcome and explain how the design addresses one selection difference."],
    criteria: ["Distinguish observation, explanation and proposed investigation.", "Attribute the sample and measure accurately.", "Define the outcome rather than using a vague success claim.", "Explain how a design choice addresses a particular limit."] },
  { level: "college_advanced", key: "scholarly_revision", title: "Scholarly synthesis and response to review", objective: "Revise a bounded scholarly claim and respond substantively to methodological criticism using an explicit evidence record.",
    text: "Original manuscript-and-review record: A draft reports a lower prediction error for method A than method B on one held-out dataset. Model selection used a separate development dataset. A reviewer notes that the held-out sample contains only one institution and asks about uncertainty, subgroup error and performance under distribution shift. The authors have not run those analyses or collected another institution's data.",
    prompts: ["Write a response to the reviewer that states what was done, accepts a warranted limitation, and proposes concrete additional analyses. Do not present planned analyses as completed or claim generalizability the record does not establish.", "Revise this conclusion for a scholarly audience: 'Method A is universally superior, and our tests resolve fairness concerns.' Preserve the supported comparison, address the reviewer's concerns, and distinguish uncertainty from absence of evidence."],
    criteria: ["State the completed evidence and its scope accurately.", "Respond to the substance of the methodological criticism.", "Label future analyses and missing data explicitly.", "Revise the strength and reach of the claim to match the record."] },
] as const;
for (const item of englishCases) {
  const parent = collection("english", item.level, item.key, item.title, item.objective, ["english.revision"]);
  const sources = [source(`${parent.course.id}-draft`, "Original writing and evidence record", item.text)];
  item.prompts.forEach((prompt, index) => task(parent, `revision-${index + 1}`, index === 0 ? "Develop an audience-aware response" : "Revise the claim and evidence", prompt,
    { kind: "writing_revision", criteria: [...item.criteria] },
    ["Identify the audience, purpose and strongest claim the record can support.", "Check every assertion against the source; explain one revision and one remaining limit."],
    { prompt: "Different example: a draft claims a survey of ten volunteers proves a city's preference.", steps: ["Name the ten-person volunteer sample instead of the whole city.", "Retain the observed preference and state what broader evidence is still needed."] }, sources));
}

const scienceCases = [
  { level: "middle_school", key: "energy_ecosystems", title: "Energy calculations and ecosystem evidence", objective: "Apply an explicitly supplied energy model and evaluate an ecosystem observation without treating correlation as a mechanism.",
    numbers: [
      { key: "energy", title: "Use a stated energy model", prompt: "In this simplified model, energy transferred = power * time. A lamp rated 6.00 W operates for 5.00 s. Find the transferred energy in J with three significant figures.", answer: "30.0 J", hints: ["Multiply power by elapsed time.", "A watt is a joule per second, so the seconds cancel."], example: { prompt: "Different example: a 2.00 W device runs for 4.00 s.", steps: ["Use E = Pt.", "The energy is 8.00 J."] } },
      { key: "density", title: "Compare matter measurements", prompt: "A sample has mass 18.0 g and measured volume 6.00 cm^3. Calculate its density in g/cm^3 with three significant figures. Use density = mass / volume.", answer: "3.00 g/cm^3", hints: ["Place mass in the numerator and volume in the denominator.", "Keep the compound unit and three significant figures."], example: { prompt: "Different example: 8.00 g occupies 4.00 cm^3.", steps: ["Divide mass by volume.", "Density is 2.00 g/cm^3."] } },
    ], record: "Original ecosystem observation: A school counted 14 pollinator visits at a flower patch one sunny morning and 5 visits the following cloudy afternoon. The observer stayed for ten minutes each time. Flower species and patch size were unchanged. Time of day, weather and the identities of the visitors were not controlled.",
    question: "What comparison does this observation support? Explain why it does not establish that cloud cover alone changed the visit count, and propose a repeated observation that would improve the comparison." },
  { level: "high_school", key: "mechanics_cell_evidence", title: "Mechanics and biological explanations", objective: "Apply explicit mechanical models and distinguish a biological observation from an untested causal explanation.",
    numbers: [
      { key: "kinetic", title: "Calculate kinetic energy", prompt: "Use kinetic energy = (1/2)mv^2 for a 2.00 kg cart moving at 3.00 m/s. Express kinetic energy in J with three significant figures.", answer: "9.00 J", hints: ["Square the speed before multiplying by mass.", "Apply the factor of one half and keep the requested precision."], example: { prompt: "Different example: m = 1.00 kg and v = 2.00 m/s.", steps: ["K = (1/2)(1.00)(2.00)^2.", "K = 2.00 J."] } },
      { key: "pressure", title: "Calculate pressure", prompt: "A perpendicular force of 24.0 N acts uniformly over an area of 3.00 m^2. Use pressure = force / area. Express pressure in Pa with three significant figures.", answer: "8.00 Pa", hints: ["Divide the normal force by the area.", "One pascal is one newton per square meter."], example: { prompt: "Different example: 10.0 N acts over 2.00 m^2.", steps: ["P = F/A.", "The pressure is 5.00 Pa."] } },
    ], record: "Original biology record: Two identical plant tissue samples were placed in equal volumes of different solutions for twenty minutes. Sample A gained mass and sample B lost mass. The initial masses and solution compositions were recorded, but temperature varied between containers. Water can cross the tissue's selectively permeable membranes; the record does not track each dissolved substance.",
    question: "Use the mass changes to propose an explanation involving net water movement. Separate the measured observation from the proposed mechanism, and explain a temperature control and an additional measurement that would help evaluate it." },
  { level: "college_intro", key: "physical_models", title: "Physical models and population evidence", objective: "Calculate quantities under explicit model assumptions and evaluate the representativeness of an ecological sampling design.",
    numbers: [
      { key: "concentration", title: "Calculate amount concentration", prompt: "A solution contains 0.150 mol of solute in a final volume of 0.500 L. Use amount concentration = amount / solution volume. Express the result in mol/L with three significant figures.", answer: "0.300 mol/L", hints: ["Use the final solution volume, not an assumed solvent volume.", "Divide moles by liters and preserve three significant figures."], example: { prompt: "Different example: 0.200 mol in a final volume of 2.00 L.", steps: ["Compute 0.200/2.00.", "The concentration is 0.100 mol/L."] } },
      { key: "spring", title: "Calculate elastic energy", prompt: "For an ideal linear spring, use stored energy = (1/2)kx^2. Let k = 8.00 N/m and displacement x = 0.500 m. Express the stored energy in J with three significant figures.", answer: "1.00 J", hints: ["Square displacement before multiplying by the spring constant.", "The model assumes the spring remains in its linear elastic range."], example: { prompt: "Different example: k=2.00 N/m and x=1.00 m.", steps: ["Use (1/2)(2.00)(1.00)^2.", "Stored energy is 1.00 J within the assumed model."] } },
    ], record: "Original ecological sampling record: Investigators placed ten equal-area quadrats along an accessible trail and counted seedlings. They reported an average of six seedlings per quadrat. Areas away from the trail were not sampled. Trail edges receive more light and experience more foot traffic than the forest interior. No random placement procedure was used.",
    question: "Explain what population the reported average directly describes and why extrapolating it to the whole forest needs support. Propose a sampling design that addresses the trail bias and name a remaining uncertainty." },
  { level: "college_advanced", key: "transport_research", title: "Transport models and research validity", objective: "Evaluate selected transport-model calculations with declared assumptions and critique a research inference. This is a bounded module, not full advanced physics, chemistry or biology coverage.",
    numbers: [
      { key: "diffusive-flux", title: "Calculate a signed diffusive flux", prompt: "Use the one-dimensional model J = -D(dc/dx). Let D = 2.00e-9 m^2/s and dc/dx = -3.00e3 mol/m^4. Calculate signed flux J in mol/m^2/s, written as mol*m^-2*s^-1, with three significant figures.", answer: "6.00e-6 mol*m^-2*s^-1", hints: ["The negative sign in the model and the negative gradient multiply to a positive flux.", "Multiply the powers of ten and combine the unit exponents."], example: { prompt: "Different example: D=1.00e-9 m^2/s and gradient=2.00e3 mol/m^4.", steps: ["Apply the leading negative sign.", "The flux is -2.00e-6 mol*m^-2*s^-1 for this model."] } },
      { key: "first-order-rate", title: "Calculate a rate under a stated law", prompt: "A stated first-order model uses disappearance rate = k*c. Let k = 0.200 s^-1 and c = 0.300 mol/L. Give the positive disappearance rate in mol*L^-1*s^-1 with three significant figures. This calculation does not establish that the model fits a real reaction.", answer: "0.0600 mol*L^-1*s^-1", hints: ["Multiply the stated coefficient by the concentration.", "Retain concentration per unit time and the requested three significant figures."], example: { prompt: "Different example: k=0.100 s^-1 and c=0.500 mol/L.", steps: ["Compute k*c.", "The model gives 0.0500 mol*L^-1*s^-1."] } },
    ], record: "Original research record: A laboratory fits a transport coefficient using three calibration runs, then evaluates predictions on two new runs from the same instrument. Residuals are smaller at low concentration than at high concentration. The report gives a single pooled error and no instrument-drift measurements. No second instrument, independent laboratory or alternative transport model has been tested.",
    question: "Assess the claim that this validation establishes a universal transport law. Distinguish calibration from evaluation, propose an analysis of the residual pattern, and identify a test of transfer to another setting without claiming the unperformed tests succeeded." },
] as const;
for (const item of scienceCases) {
  const parent = collection("science", item.level, item.key, item.title, item.objective, ["science.measurement", "science.evidence_reasoning"]);
  for (const entry of item.numbers) task(parent, entry.key, entry.title, entry.prompt,
    { kind: "science_dimensions", expected: entry.answer, significantFigures: 3 }, [...entry.hints], { prompt: entry.example.prompt, steps: [...entry.example.steps] });
  task(parent, "explanation", "Evaluate the scientific claim", item.question,
    { kind: "science_explanation", criteria: ["State the recorded observation and its scope.", "Distinguish the observation from the mechanism or generalization being proposed.", "Propose a concrete measurement, control or sampling change that addresses a stated limit.", "Identify a remaining uncertainty rather than promising that one test settles the question."] },
    ["List what was observed and what the claim adds beyond those observations.", "Connect each proposed improvement to the particular uncertainty it would address."],
    { prompt: "Different example: a model is fitted to one instrument and evaluated only on that instrument.", steps: ["New runs can test prediction within that setting.", "Testing another instrument addresses transfer; it must be conducted before claiming that transfer is supported."] },
    [source(`${parent.course.id}-record`, "Original scientific practice record", item.record)]);
}

const historyCases = [
  { level: "middle_school", key: "chronology_perspective", title: "Chronology and historical perspective", objective: "Sequence dated fictional evidence and explain how author position affects what a source can establish.",
    sources: [
      ["Original simulation: ferry ledger, 1882", "Authored historical simulation, not an authentic archival document. A ferry clerk's ledger lists fares collected on April 2, April 9 and April 16, 1882. A note dated April 9 records the first week of reduced fares. The ledger records payments, not individual passengers, their reasons for travel or people who did not use the ferry."],
      ["Original simulation: resident's recollection, 1890", "Authored historical simulation, not an authentic archival document. In an 1890 letter, a resident recalled visiting relatives more often after the fare reduction. The writer also said a new factory had opened near the landing in May 1882. The letter describes one person's experience and does not provide a count of all trips."]
    ], prompts: ["Build a short timeline from both sources. Distinguish the fare reduction, factory opening and later recollection, and explain what the order alone cannot tell you about causes.", "Compare what the clerk and resident could know directly. Use a quotation from each and name a perspective absent from both accounts."] },
  { level: "high_school", key: "institutional_change", title: "Institutions, causation and missing voices", objective: "Evaluate a causal claim about an institutional change with contemporaneous and retrospective fictional evidence.",
    sources: [
      ["Original simulation: school committee report, 1912", "Authored historical simulation, not an authentic archival document. The committee reported that it opened an evening classroom in September 1912 and counted 38 registrations in the first month. Registration forms asked for names and occupations but not whether registrants attended. The committee described the opening as a success in its request for another year of funding."],
      ["Original simulation: worker's oral account, 1935", "Authored historical simulation, not an authentic archival document. Recalling 1912 in a 1935 interview, a worker said the evening classroom was welcoming but work shifts often prevented attendance. The interviewer selected former students through the committee's contact list. People who never registered were not represented in the interview group."]
    ], prompts: ["Evaluate the claim that opening the classroom immediately made education accessible to all local workers. Analyze the report's purpose, its measure and the later account's sampling limits.", "Propose two additional types of records that would help assess change in access. Explain what each could establish, whose experience it might miss, and how it would relate to these two sources."] },
  { level: "college_intro", key: "historical_arguments", title: "Historical argument and archival silences", objective: "Construct a limited historical argument while accounting for institutional categories, source selection and missing records.",
    sources: [
      ["Original simulation: municipal housing inventory, 1927", "Authored historical simulation, not an authentic archival document. A municipal inventory counted permitted apartment units by district in 1927. Buildings without permits were excluded by rule. The report used the inventory to recommend inspection staffing, not to estimate the number of people without secure housing."],
      ["Original simulation: mutual-aid notebook, 1928", "Authored historical simulation, not an authentic archival document. Volunteers recorded requests for temporary rooms during winter 1928. The notebook included only people who reached the organization's office, sometimes under an abbreviated name. It did not record successful arrangements consistently or cover the whole city."]
    ], prompts: ["Develop a bounded argument about what these records make visible and obscure about housing. Explain how each institution's purpose shapes its categories and avoid treating missing entries as proof that no need existed.", "Design a corroboration strategy for a question about temporary housing access. State which units of observation differ between these records and what would be needed before combining their counts."] },
  { level: "college_advanced", key: "historiography_methods", title: "Historiography and comparative method", objective: "Evaluate competing historical explanations and the comparability of constructed archival categories. Authentic archives, historical fact coverage and disciplinary review remain separate requirements.",
    sources: [
      ["Original simulation: comparative historian A", "Authored historiographical simulation, not a published historical argument. Historian A attributes the spread of cooperatives in two regions primarily to a new credit rule. The comparison counts registered cooperatives before and after the rule. In one region, the registration office also changed its definition to include older associations that had previously been listed elsewhere."],
      ["Original simulation: comparative historian B", "Authored historiographical simulation, not a published historical argument. Historian B emphasizes local organizing networks and questions whether the two registration series measure the same phenomenon. Surviving letters describe meetings, but they come mainly from the better-funded region. B recommends tracing the category change and comparing organizations using a consistent definition before weighing the competing causal accounts."]
    ], prompts: ["Compare the two explanations without assuming one must exclude the other. Assess how the registration definition and uneven survival of letters affect the inference, using exact evidence from each source.", "Propose a defensible comparative research strategy. Specify a consistent unit, a way to examine the category change, and evidence that could distinguish the credit-rule and organizing explanations. State what the surviving record may leave unresolved."] },
] as const;
for (const item of historyCases) {
  const parent = collection("history", item.level, item.key, item.title, item.objective, ["history.source_analysis"]);
  const sources = item.sources.map(([title, text], index) => source(`${parent.course.id}-source-${index + 1}`, title, text));
  item.prompts.forEach((prompt, index) => task(parent, `analysis-${index + 1}`, index === 0 ? "Assess the historical claim" : "Plan a source comparison", prompt,
    { kind: "history_sources", minimumSources: 2, criteria: ["Identify source date, author position and purpose.", "Use attributed quotations from both supplied sources.", "Explain how category, selection or perspective affects the claim.", "Distinguish documented evidence from inference and identify a specific remaining gap."] },
    ["Make a record of dates, source purposes and what each account directly records.", "Explain why the gap matters for this particular claim, then name evidence that could address it."],
    { prompt: "Different example: one ledger counts tickets and one diary describes a single visit.", steps: ["Tickets and individual visitors are different units; one person may buy several tickets.", "The diary supplies a perspective, not a complete visitor count."] }, sources));
}

/** Explicit gaps are part of the content contract, never hidden by a populated level selector. */
export const CURRICULUM_SCOPE_LIMITS = {
  math: ["General proofs and proof feedback", "General transcendental equations", "Full calculus, statistics and linear algebra sequences"],
  reading: ["Decoding and oral reading assessment", "Long-form literature and disciplinary reading", "Automated interpretation grading"],
  english: ["Full composition curriculum and portfolio progression", "Automated grammar or originality judgments", "Discipline-specific scholarly writing review"],
  science: ["Laboratory procedures and safety qualification", "Full biology, chemistry, physics and earth-science sequences", "Uncertainty propagation and open scientific modeling"],
  history: ["Authentic licensed or public-domain archival collections", "Geographic and chronological factual survey coverage", "Automatic historical accuracy or argument grading"],
} as const;
