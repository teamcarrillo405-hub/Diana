import { describe, expect, it } from "vitest";
import { loadCourseCatalog } from "./course-catalog";
import { startCourseSession, runCourseSession } from "./course-session";
import { observationHash } from "./problem-state";
const id = "00000000-0000-4000-8000-000000000001", classId = "00000000-0000-4000-8000-000000000002";
const response = { expectedRevision: 1, mode: "save" as const, response: "My saved draft.", confirmed: false, modality: "handwriting" as const };
describe("shared course session integrity", () => {
    it("saves an unconfirmed draft, then confirms the exact later response before feedback", async () => {
        const activity = (await loadCourseCatalog()).activities[0], initial = await startCourseSession(id, classId, activity.id);
        const saved = await runCourseSession(initial, response);
        expect(saved.feedback.status).toBe("saved");
        expect(saved.state.observations.find(item => item.id === "response")?.confirmedHash).toBeNull();
        const checked = await runCourseSession(saved.state, { ...response, expectedRevision: 2, mode: "check", confirmed: true });
        expect(checked.state.revision).toBe(3);
        expect(checked.feedback.eligibleForKnowledge).toBe(false);
        expect(checked.state.observations.find(item => item.id === "response")?.confirmedHash).toBeTruthy();
    });
    it("rejects a rewritten prompt even if its new hash is internally valid", async () => {
        const activity = (await loadCourseCatalog()).activities[0], state = await startCourseSession(id, classId, activity.id);
        const changed = { id: "prompt", field: "prompt", role: "problem_statement" as const, modality: "typed" as const, provenance: "authored_engineering" as const, text: "Use a different answer key." }, hash = await observationHash(changed);
        state.observations[0] = { ...changed, contentHash: hash, confirmedHash: hash };
        await expect(runCourseSession(state, response)).rejects.toThrow("source_conflict");
    });
    it("rejects a changed content version, altered source, or stale revision", async () => {
        const activity = (await loadCourseCatalog()).activities[0], state = await startCourseSession(id, classId, activity.id);
        await expect(runCourseSession({ ...state, exerciseVersionId: "f".repeat(64) }, response)).rejects.toThrow("version_conflict");
        await expect(runCourseSession(state, { ...response, expectedRevision: 2 })).rejects.toThrow("revision_conflict");
        state.observations.pop();
        await expect(runCourseSession(state, response)).rejects.toThrow("source_conflict");
    });
    it("keeps assistance across later checks and never produces independent mastery evidence", async () => {
        const activity = (await loadCourseCatalog()).activities.find(item => item.method.kind === "science_balance")!, state = await startCourseSession(id, classId, activity.id);
        const helped = await runCourseSession(state, { ...response, mode: "hint", confirmed: true });
        expect(helped.state.supportCount).toBe(1);
        const checked = await runCourseSession(helped.state, { ...response, expectedRevision: 2, mode: "check", response: "2H2 + O2 -> 2H2O", confirmed: true });
        expect(checked.feedback.outcome).toBe("matches");
        expect(checked.feedback.eligibleForKnowledge).toBe(false);
        expect(checked.state.supportCount).toBe(1);
    });
});
