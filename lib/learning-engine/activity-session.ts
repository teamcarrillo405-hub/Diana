import type { VersionedActivity } from "./course-activities";
import { runCourseTutor } from "./course-tutor";
import { emptyProblemState, observationHash, reviseProblemState, validateProblemState, type ProblemObservation, type ProblemState } from "./problem-state";
import type {RecognitionEvidence} from "./recognition";
export type ActivityResponse = {
    expectedRevision: number;
    mode: "check" | "hint" | "example" | "save";
    response: string;
    confirmed: boolean;
    modality: "typed" | "handwriting" | "voice";
    recognitionEvidence?:RecognitionEvidence;
    recognitionProof?:string;
};
export async function startActivitySession(id: string, scope: ProblemState["scope"], activity: VersionedActivity, binding?: string): Promise<ProblemState> {
    const observations: ProblemObservation[] = [{ id: "prompt", field: "prompt", role: "problem_statement", modality: "typed", provenance: "authored_engineering", text: activity.prompt }];
    if (binding)
        observations.push({ id: "binding", field: "binding", role: "given", modality: "typed", provenance: "authored_engineering", text: binding });
    for (const source of activity.sources)
        for (let offset = 0; offset < source.text.length; offset += 4000) {
            const text = source.text.slice(offset, offset + 4000), id = "source:" + source.id + ":" + offset;
            observations.push(source.authorship === "course_material"
                ? { id, field: id, role: "given", modality: source.nativePdf ? "pdf_region" : "typed", provenance: source.nativePdf ? "native_pdf" : "student_entered", text,
                    source: { versionId: source.anchor.versionId, ...(source.assetHash ? { assetHash: source.assetHash } : {}), page: source.anchor.location.page, startOffset: source.anchor.location.startOffset + offset, endOffset: source.anchor.location.startOffset + offset + text.length } }
                : { id, field: id, role: "given", modality: "typed", provenance: "authored_engineering", text });
        }
    return { ...emptyProblemState(id, scope), exerciseVersionId: activity.versionId, observations: await Promise.all(observations.map(async (item) => { const contentHash = await observationHash(item); return { ...item, contentHash, confirmedHash: contentHash }; })) };
}
export async function validateActivitySession(previous: ProblemState, expected: ProblemState) {
    await validateProblemState(previous);
    if (previous.exerciseVersionId !== expected.exerciseVersionId || previous.scope.classId !== expected.scope.classId || previous.scope.assignmentId !== expected.scope.assignmentId || previous.scope.exerciseId !== expected.scope.exerciseId)
        throw new Error("problem_version_conflict");
    const immutable = previous.observations.filter(item => item.id !== "response");
    if (immutable.length !== expected.observations.length || expected.observations.some(item => !immutable.some(saved => saved.id === item.id && saved.contentHash === item.contentHash && saved.confirmedHash === item.contentHash)))
        throw new Error("problem_source_conflict");
}
export async function runActivitySession(previous: ProblemState, expected: ProblemState, activity: VersionedActivity, input: ActivityResponse) {
    await validateActivitySession(previous, expected);
    const saved=previous.observations.find(item=>item.id==="response");
    const evidence=input.recognitionEvidence??(saved?.provenance==="machine_interpretation"&&saved.recognitionEvidence&&
        saved.text===input.response&&saved.modality===input.modality?saved.recognitionEvidence:undefined);
    const proof=input.recognitionProof??(evidence&&saved?.recognitionEvidence===evidence?saved.recognitionProof:undefined);
    const observation: ProblemObservation = { id: "response", field: "response", role: input.modality === "voice" ? "spoken_reasoning" : "student_step",
        modality: input.modality, provenance:evidence?"machine_interpretation":"student_entered", text: input.response,
        ...(evidence?{recognitionEvidence:evidence,recognitionProof:proof}:{}) };
    const state = await reviseProblemState(previous, { expectedRevision: input.expectedRevision, put: input.response.trim() ? [observation] : [], remove: !input.response.trim() && previous.observations.some(item => item.id === "response") ? ["response"] : [], confirm: input.response.trim() && input.confirmed ? [{ id: "response", contentHash: await observationHash(observation) }] : [] });
    if(!input.confirmed)state.observations=state.observations.map(item=>item.id==="response"?{...item,confirmedHash:null}:item);
    const feedback = await runCourseTutor(activity, { mode: input.mode, response: input.response, confirmed: input.confirmed, priorSupport: state.supportCount });
    if (feedback.assistance !== "unchanged")
        state.supportCount = Math.min(100, state.supportCount + 1);
    return { state, feedback };
}
