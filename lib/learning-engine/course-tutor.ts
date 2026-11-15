import { z } from "zod";
import { verifyChemicalEquationBalance, verifyQuantityInExpectedUnit } from "@/lib/assignment-help/deterministic-verifiers";
import { runLocalTutor } from "./local-tutor";
import { CAPABILITIES, type VersionedActivity } from "./course-activities";
import { courseContentHash } from "./course-framework";
import type { CourseFeedback } from "./course-feedback";
import { verifyCompoundQuantity, verifyIonicCoefficients } from "./science-checks";
import { graphAnswerExpression } from "./course-graphs";
import { validateStochasticGivens, checkStochasticResponse } from './stochastic-matrix';
export { courseFeedbackSchema, type CourseFeedback } from "./course-feedback";
export const courseResponseSchema = z.object({ mode: z.enum(["check", "hint", "example", "save"]), response: z.string().max(4000), confirmed: z.boolean(), priorSupport: z.number().int().min(0).max(100) }).strict();
async function quoteEvidence(activity: VersionedActivity, response: string) {
    const found = [...response.matchAll(/"([^"\n]{3,1000})"|“([^”\n]{3,1000})”/gu)].map(match => match[1] ?? match[2]);
    const quotes: CourseFeedback["quotes"] = await Promise.all(found.slice(0, 8).map(async (quote) => {
        const matches = activity.sources.flatMap(source=>{const positions:number[]=[];let offset=source.text.indexOf(quote);while(offset>=0&&positions.length<2){positions.push(offset);offset=source.text.indexOf(quote,offset+1);}return positions.map(start=>({source,start}));});
        const match=matches.length===1?matches[0]:null,source=match?.source,start=match?.start??null;
        const anchor=source?.authorship==="course_material"&&start!==null?{...source.anchor,exactText:quote,location:{...source.anchor.location,startOffset:source.anchor.location.startOffset+start,endOffset:source.anchor.location.startOffset+start+quote.length}}:null;
        return { quote, status: matches.length === 1 ? "exact" as const : matches.length > 1 ? "ambiguous" as const : "not_found" as const, sourceId: source?.id ?? null, sourceHash: source ? await courseContentHash(source) : null, startOffset: start, endOffset: start === null ? null : start + quote.length,anchor };
    }));
    const count = new Set(quotes.flatMap(quote => quote.sourceId ? [quote.sourceId] : [])).size;
    return { quotes, count, overflow: found.length > 8 };
}
function sameSpecies(response: string, method: Extract<VersionedActivity["method"], {
    kind: "science_balance";
}>) {
    const sides = response.replaceAll("→", "->").split(/->|=/u);
    if (sides.length !== 2)
        return false;
    const parse = (side: string) => side.split("+").map(term => term.trim().replace(/^[1-9]\d*\s*/u, "").replaceAll(" ", "")).sort();
    return JSON.stringify(parse(sides[0])) === JSON.stringify([...method.reactants].sort()) && JSON.stringify(parse(sides[1])) === JSON.stringify([...method.products].sort());
}
/** Pure, bounded subject dispatch. All activities must be resolved from the server catalog. */
export async function runCourseTutor(activity: VersionedActivity, raw: unknown): Promise<CourseFeedback> {
    const input = courseResponseSchema.parse(raw), capability = CAPABILITIES[activity.method.kind];
    const result: CourseFeedback = { title: "Review your work", guidance: "", steps: [], nextQuestion: "", status: "review", outcome: "unverified", checkMode: capability.check, assistance: "unchanged", providerCalled: false, eligibleForKnowledge: false, quotes: [], limitations: [capability.limits, "Practice guidance is awaiting educator review. This feedback does not establish mastery."] };
    if (input.mode === "save")
        return { ...result, title: "Work saved", guidance: "You can return to this response later.", status: "saved" };
    if (!input.confirmed)
        return { ...result, title: "Confirm your work", guidance: "Confirm that the transcription matches your work before using this feedback.", status: "needs_confirmation" };
    if (activity.method.kind === 'math_row_stochastic') {
        const givens = validateStochasticGivens(activity.method.specification);
        if (!givens.ok) return { ...result, title: 'Confirm the supplied probabilities', status: 'unsupported',
            guidance: givens.guidance, nextQuestion: 'Which supplied row or initial probability can you confirm with the original source?' };
    }
    if (input.mode === "hint")
        return { ...result, title: "Take one step", guidance: activity.hints[Math.min(input.priorSupport, activity.hints.length - 1)], nextQuestion: "What would you try next?", status: "help", assistance: "hinted" };
    if (input.mode === "example")
        return { ...result, title: "Compare a different example", guidance: activity.example.prompt, steps: activity.example.steps, nextQuestion: "How can you apply that approach to your own question?", status: "help", assistance: "example_assisted" };
    if (!input.response.trim())
        return { ...result, title: "Add your response", guidance: "Write your attempt before requesting feedback.", status: "unsupported" };
    const method = activity.method;
    if (method.kind === 'math_row_stochastic') {
        const checked = checkStochasticResponse(method.specification, input.response);
        return { ...result, title: 'Check the probability vector', guidance: checked.guidance,
            status: checked.status === 'unsupported' ? 'unsupported' : 'checked',
            outcome: checked.status === 'unsupported' ? 'unverified' : checked.status,
            nextQuestion: 'How does each initial-state probability contribute to one destination component?',
            steps: ['Use the stated row-vector convention p_next = pP. This checks the declared calculation, not whether the model describes a real system.'] };
    }
    if (method.kind === "computing_rubric") {
        return { ...result, title: "Review your reasoning", guidance: "Compare your trace or explanation with the stated rules and criteria. This check does not execute code or decide correctness.",
            steps: [...method.criteria], nextQuestion: "Which intermediate state or assumption would you check first?" };
    }
    if(method.kind === "science_dimensions" || method.kind === "science_ionic") {
        const checked=method.kind==="science_dimensions"?verifyCompoundQuantity(method.expected,input.response,method.significantFigures):verifyIonicCoefficients(method.reactants,method.products,input.response);
        return {...result,title:method.kind==="science_dimensions"?"Check the measurement":"Check atoms and charge",guidance:checked.guidance,steps:checked.observations,nextQuestion:"Explain how your setup supports the result.",status:checked.status==="unsupported"?"unsupported":"checked",outcome:checked.status==="unsupported"?"unverified":checked.status};
    }
    if (method.kind === "math_exact" || method.kind === "science_graph") {
        const specification = method.kind === "math_exact" ? method.specification : { kind: "equivalent_expression" as const, reference: graphAnswerExpression(method.graph, method.task), variable: "x" };
        const checked = await runLocalTutor({ exercise: { id: activity.id, versionId: activity.versionId, skillId: activity.skillId, prompt: activity.prompt, specification, reviewed: false, sourceConfirmed: true }, attempt: { problemId: activity.id, versionId: activity.versionId, response: input.response, confirmed: input.confirmed, assistance: input.priorSupport ? "hinted" : "unverified", priorHelpCount: input.priorSupport }, mode: "check" });
        const graphGuidance = checked.assessment?.outcome === "supported"
            ? "Your number matches the requested result from the plotted observations."
            : checked.assessment?.outcome === "revise"
                ? "Recheck the stated point or interval and your calculation. Keep the requested sign and exact value."
                : "Enter a number or exact fraction for the stated graph task.";
        // Numeric authored tasks share the exact algebra checker, but their
        // feedback should describe the requested value instead of polynomial form.
        const numericResult = method.kind === "math_exact" && method.specification.kind === "equivalent_expression"
            && /^[0-9+\-*/^().\s]+$/u.test(method.specification.reference);
        const numericGuidance = checked.assessment?.outcome === "supported"
            ? "Your exact value matches the requested result."
            : checked.assessment?.outcome === "revise"
                ? "Recheck the quantities and operations in your calculation. Keep the requested sign and exact value."
                : "Enter an exact number or fraction for this question.";
        return { ...result,
            title: method.kind === "science_graph" ? "Check the plotted data" : "Check your calculation",
            guidance: method.kind === "science_graph" ? graphGuidance : numericResult ? numericGuidance : checked.guidance,
            steps: method.kind === "science_graph" ? ["This checks the requested number only. A causal explanation needs separate evidence and review."]
                : numericResult ? ["This checks the final value. Your setup and reasoning need a separate explanation."] : checked.steps,
            nextQuestion: method.kind === "science_graph" ? "Which recorded points did you use, and what would you need to investigate a cause?"
                : numericResult ? "How do your chosen operations lead to this value?" : checked.nextQuestion,
            status: checked.assessment?.status === "supported" ? "checked" : "unsupported",
            outcome: checked.assessment?.outcome === "supported" ? "matches" : checked.assessment?.outcome === "revise" ? "revise" : "unverified",
            limitations: [...result.limitations, ...(checked.assessment?.limitations ?? [])] };
    }
    if (method.kind === "science_quantity") {
        const checked = verifyQuantityInExpectedUnit({ expected: method.expected, actual: input.response, requiredSignificantFigures: method.significantFigures }), verifier = checked.verifierResult;
        const guidance = verifier.status === "passed" ? "Your value, requested unit and precision match this question." : verifier.status === "inconclusive" ? "This check needs a number followed by a supported single unit." : verifier.summary.startsWith("Use the requested unit:") ? verifier.summary : "Review the converted value, unit and significant figures.";
        return { ...result, title: "Check the measurement", guidance, steps: verifier.observations.filter(item => !item.startsWith("Absolute difference:") && !item.startsWith("Allowed tolerance:")), nextQuestion: "Explain the conversion factor and why this precision is appropriate.", status: verifier.status === "inconclusive" ? "unsupported" : "checked", outcome: verifier.status === "passed" ? "matches" : verifier.status === "not_passed" ? "revise" : "unverified", limitations: [...result.limitations, ...verifier.limitations] };
    }
    if (method.kind === "science_data_comparison") {
        const parts = input.response.split(",").map(part => part.trim());
        const numberPattern = /^[+-]?(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/u;
        if (parts.length !== 3 || parts.some(part => !numberPattern.test(part)))
            return { ...result, title: "Compare the recorded data", guidance: "Enter three numbers separated by commas: first group mean, second group mean, then second minus first. Use the stated unit for all three.", status: "unsupported" };
        const actual = parts.map(Number);
        if (actual.some(value => !Number.isFinite(value) || Math.abs(value) > 1000000))
            return { ...result, title: "Compare the recorded data", guidance: "Use finite values within the range of the recorded measurements.", status: "unsupported" };
        const [first, second] = method.groups;
        const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
        const firstMean = mean(first.values), secondMean = mean(second.values);
        const rounded = (value: number) => Number(value.toFixed(method.decimalPlaces));
        const expected = [rounded(firstMean), rounded(secondMean), rounded(secondMean - firstMean)];
        const matches = actual.every((value, index) => Math.abs(value - expected[index]) < 1e-9);
        return { ...result, title: "Compare the recorded data",
            guidance: matches ? "The two means and their numerical difference align with the recorded trials." : "Recheck each sum and group size, then subtract the first group mean from the second.",
            steps: [`Use ${first.values.length} recorded values for ${first.label} and ${second.values.length} for ${second.label}.`, "This verifies arithmetic only. The record's other group differences still matter for interpretation."],
            nextQuestion: "What else differed between the groups, and what follow-up comparison would address it?",
            status: "checked", outcome: matches ? "matches" : "revise" };
    }
    if (method.kind === "science_balance") {
        if (!sameSpecies(input.response, method))
            return { ...result, title: "Keep the stated substances", guidance: "Use the same formulas on the same sides. Change only the coefficients in front of them.", status: "unsupported" };
        const checked = verifyChemicalEquationBalance(input.response), verifier = checked.verifierResult;
        return { ...result, title: "Check atom conservation", guidance: verifier.summary, steps: verifier.observations, nextQuestion: "How does each coefficient affect the number of atoms?", status: checked.balanced === null ? "unsupported" : "checked", outcome: checked.balanced === true ? "matches" : checked.balanced === false ? "revise" : "unverified", limitations: [...result.limitations, ...verifier.limitations] };
    }
    const evidence = await quoteEvidence(activity, input.response);
    result.quotes = evidence.quotes;
    if (evidence.overflow)
        result.limitations.push("Only the first eight marked quotations were checked.");
    result.steps = evidence.quotes.map(quote => quote.status === "exact" ? "Exact words found in " + activity.sources.find(source => source.id === quote.sourceId)!.title + "." : quote.status === "ambiguous" ? "These words occur in more than one location. Use a longer, distinctive quotation." : "A marked quotation does not exactly match these passages. Check the wording or identify it as a paraphrase.");
    if (method.kind === "reading_evidence" || method.kind === "history_sources") {
        result.title = "Review your evidence";
        result.guidance = evidence.count >= method.minimumSources ? `Exact quotations were located in ${evidence.count} ${evidence.count===1?"passage":"passages"}. Review how each supports your explanation.` : `Use evidence from ${method.minimumSources} selected ${method.minimumSources===1?"passage":"passages"}. Exact quotations were located in ${evidence.count}.`;
    }
    else {
        const words = input.response.trim().split(/\s+/u).length, paragraphs = input.response.trim().split(/\n\s*\n/u).length;
        result.title = method.kind === "writing_revision" ? "Review your draft" : "Review your explanation";
        result.guidance = `Your response has ${words} words in ${paragraphs} ${paragraphs === 1 ? "paragraph" : "paragraphs"}. Use the criteria below to decide what to revise.`;
        result.limitations.push("Length and quotation matches are observations, not a judgment of writing quality or scientific understanding.");
    }
    result.steps.push(...method.criteria);
    result.nextQuestion = "Which part would you revise, and why?";
    return result;
}
