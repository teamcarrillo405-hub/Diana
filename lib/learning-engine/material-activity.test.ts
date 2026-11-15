import { describe, it, expect, vi } from "vitest";
import { structureDocument, validateDocumentAnchor } from "./curriculum";
import { buildMaterialActivity, startMaterialSession, restoreMaterialSession, materialPassage, type MaterialBinding } from "./material-activity";
import { runActivitySession } from "./activity-session";
import { runCourseTutor } from "./course-tutor";
import { observationHash } from "./problem-state";
const scope = { ownerId: "00000000-0000-4000-8000-000000000001", assignmentId: "00000000-0000-4000-8000-000000000002", classId: "00000000-0000-4000-8000-000000000003" }, id = "00000000-0000-4000-8000-000000000004";
async function fixture(subject: "english" | "science" = "english") {
    const document = await structureDocument({ ...scope, documentId: "test-source", title: "Class reading", edition: "1", subject, instructionRights: "owner_provided", sourceAssetHash: "a".repeat(64) }, [{ page: 1, pageLabel: "i", text: "# Observations\n\nThe temperature rose during the trial. The room also became warmer.\n\nA second report recommends a comparison group before drawing a conclusion.", interpretation: "original" }]);
    const binding: MaterialBinding = { version: "material-practice-v1", task: subject === "science" ? "explain" : "read", level: "high_school", passages: document.blocks.filter(item => item.kind === "paragraph").map(block => ({ versionId: document.version.id, blockId: block.id })) };
    return { document, binding };
}
describe("practice grounded in owned material", () => {
    it("uses selected exact passages, actual page offsets and no provider or invented grade", async () => {
        const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network_forbidden"));
        try {
            const { document, binding } = await fixture();
            const { activity } = await buildMaterialActivity(binding, [document], scope);
            const feedback = await runCourseTutor(activity, { mode: "check", response: 'My reading uses "The temperature rose during the trial." and "A second report recommends a comparison group".', confirmed: true, priorSupport: 0 });
            expect(feedback).toMatchObject({ status: "review", outcome: "unverified", providerCalled: false, eligibleForKnowledge: false });
            expect(feedback.quotes).toHaveLength(2);
            for (const quote of feedback.quotes) {
                expect(quote.status).toBe("exact");
                expect(validateDocumentAnchor(quote.anchor!, document)).toBe(true);
                expect(quote.anchor!.location.pageLabel).toBe("i");
            }
            expect(feedback.quotes[0].anchor!.location.startOffset).toBeGreaterThan(0);
            expect(activity.sources.every(source => source.authorship === "course_material" && source.trainingPermission === "excluded")).toBe(true);
            expect(network).not.toHaveBeenCalled();
        }
        finally {
            network.mockRestore();
        }
    });
    it("rejects cross-owner, assignment and class sources and forged block text", async () => {
        const { document, binding } = await fixture();
        for (const key of ["ownerId", "assignmentId", "classId"] as const)
            await expect(buildMaterialActivity(binding, [{ ...document, version: { ...document.version, [key]: id } }], scope)).rejects.toThrow("scope_conflict");
        await expect(buildMaterialActivity(binding, [{ ...document, blocks: document.blocks.map(block => ({ ...block, text: "Fabricated evidence" })) }], scope)).rejects.toThrow("passage_unavailable");
        await expect(buildMaterialActivity(binding, [], scope)).rejects.toThrow("source_unavailable");
    });
    it("holds back unconfirmed text, tables and diagrams", async () => {
        const { document } = await fixture(), block = document.blocks.find(item => item.kind === "paragraph")!;
        for (const changed of [{ ...block, needsConfirmation: true }, { ...block, kind: "table" as const }, { ...block, kind: "diagram" as const }, { ...block, versionId: "0".repeat(64) }])
            expect(() => materialPassage({ ...document, blocks: [changed] }, changed)).toThrow("passage_unavailable");
        expect(() => materialPassage({ ...document, pages: document.pages.map(page => ({ ...page, interpretation: "model_extraction" as const })) }, block)).toThrow("passage_unavailable");
    });
    it("binds task, level and source version without replacing saved source observations", async () => {
        const { document, binding } = await fixture(), created = await startMaterialSession(id, scope, binding, [document]);
        const next = await runActivitySession(created.state, created.state, created.activity, { mode: "save", response: "My draft", expectedRevision: 1, confirmed: false, modality: "voice" });
        expect(next.state.observations.find(item => item.id === "response")?.confirmedHash).toBeNull();
        expect((await restoreMaterialSession(next.state, scope, [document])).activity.versionId).toBe(created.activity.versionId);
        const changed = await buildMaterialActivity({ ...binding, task: "revise" }, [document], scope);
        expect(changed.activity.versionId).not.toBe(created.activity.versionId);
        const altered = structuredClone(next.state), observation = altered.observations.find(item => item.id === "prompt")!;
        observation.text = "Changed instructions";
        const { contentHash: _hash, confirmedHash: _confirmed, ...base } = observation;
        observation.contentHash = await observationHash(base);
        observation.confirmedHash = observation.contentHash;
        await expect(restoreMaterialSession(altered, scope, [document])).rejects.toThrow("source_conflict");
        await expect(restoreMaterialSession({ ...next.state, scope: { ...next.state.scope, assignmentId: id } }, scope, [document])).rejects.toThrow("version_conflict");
    });
    it("never infers a scientific answer key from a source, and rejects unsupported tasks and duplicated selections", async () => {
        const { document, binding } = await fixture("science"), { activity } = await buildMaterialActivity(binding, [document], scope);
        expect(activity.method.kind).toBe("science_explanation");
        expect(await runCourseTutor(activity, { mode: "check", response: "This proves my theory.", confirmed: true, priorSupport: 0 })).toMatchObject({ status: "review", outcome: "unverified" });
        await expect(buildMaterialActivity({ ...binding, level: "college_advanced" }, [document], scope)).rejects.toThrow();
        await expect(buildMaterialActivity({ ...binding, task: "science_quantity" }, [document], scope)).rejects.toThrow();
        await expect(buildMaterialActivity({ ...binding, passages: [binding.passages[0], binding.passages[0]] }, [document], scope)).rejects.toThrow();
    });
    it("does not claim a unique citation when text occurs twice in one passage", async () => {
        const { document, binding } = await fixture(), { activity } = await buildMaterialActivity(binding, [document], scope);
        const repeated = { ...activity, sources: activity.sources.map(item => ({ ...item, text: item.text + " " + item.text })) };
        const result = await runCourseTutor(repeated, { mode: "check", response: '"The temperature rose during the trial."', confirmed: true, priorSupport: 0 });
        expect(result.quotes[0]).toMatchObject({ status: "ambiguous", anchor: null, sourceId: null });
    });
});
