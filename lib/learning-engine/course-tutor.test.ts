import { describe, expect, it, vi } from "vitest";
import { loadCourseCatalog } from "./course-catalog";
import { runCourseTutor } from "./course-tutor";
import { activityMethodSchema, validateCourseActivities } from "./course-activities";
const attempt = (response: string) => ({ mode: "check", response, confirmed: true, priorSupport: 0 });
describe("subject-specific teaching through the shared engine", () => {
    it("loads all declared courses with local help while making no network calls", async () => {
        const network = vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("network_forbidden"); });
        try {
            const { framework, activities } = await loadCourseCatalog();
            expect(framework.courses).toHaveLength(73);
            expect(activities).toHaveLength(155);
            for (const activity of activities) {
                expect((await runCourseTutor(activity, { ...attempt(""), mode: "hint" })).assistance).toBe("hinted");
                expect((await runCourseTutor(activity, { ...attempt(""), mode: "example" })).steps.length).toBeGreaterThan(0);
            }
            expect(network).not.toHaveBeenCalled();
        }
        finally {
            network.mockRestore();
        }
    });
    it("keeps exact quotes distinct from interpretation, including multiple and ambiguous sources", async () => {
        const activity = (await loadCourseCatalog()).activities.find(item => item.method.kind === "reading_evidence")!;
        const response = 'My claim uses "' + activity.sources[0].text.slice(0, 70) + '" and "' + activity.sources[1].text.slice(0, 60) + '".';
        const result = await runCourseTutor(activity, attempt(response));
        expect(result.outcome).toBe("unverified");
        expect(result.status).toBe("review");
        expect(result.quotes.every(quote => quote.status === "exact")).toBe(true);
        expect(new Set(result.quotes.map(quote => quote.sourceId)).size).toBe(2);
        expect(result.eligibleForKnowledge).toBe(false);
        expect((await runCourseTutor(activity, attempt('"A fabricated statement from no source."'))).quotes[0].status).toBe("not_found");
        const ambiguous = { ...activity, sources: activity.sources.map(source => ({ ...source, text: "The same sentence. " + source.text })) };
        expect((await runCourseTutor(ambiguous, attempt('"The same sentence."'))).quotes[0]).toMatchObject({ status: "ambiguous", sourceId: null });
    });
    it("checks value, compatible units and precision; unsupported compound units remain ungraded", async () => {
        const activities = (await loadCourseCatalog()).activities.filter(item => item.method.kind === "science_quantity");
        for (const activity of activities) {
            if (activity.method.kind !== "science_quantity")
                continue;
            expect((await runCourseTutor(activity, attempt(activity.method.expected))).outcome).toBe("matches");
        }
        const activity = activities[0];
        expect((await runCourseTutor(activity, attempt("2.5 m"))).outcome).toBe("revise");
        expect((await runCourseTutor(activity, attempt("2.50 g"))).outcome).toBe("revise");
        expect((await runCourseTutor(activity, attempt("2.50 m/s"))).status).toBe("unsupported");
        expect((await runCourseTutor(activity, attempt("250. cm"))).outcome).toBe("revise");
        expect((await runCourseTutor(activity, attempt("2.50 meters"))).outcome).toBe("matches");
    });
    it("binds chemical checking to the original species and checks counts", async () => {
        const activity = (await loadCourseCatalog()).activities.find(item => item.method.kind === "science_balance")!;
        expect((await runCourseTutor(activity, attempt("2H2 + O2 -> 2H2O"))).outcome).toBe("matches");
        expect((await runCourseTutor(activity, attempt("H2 + O2 -> H2O"))).outcome).toBe("revise");
        for (const response of ["N2 + 3H2 -> 2NH3", "H2 + O2 -> H2O2", "2H2O -> 2H2 + O2", "0H2 + 0O2 -> 0H2O"]) {
            expect((await runCourseTutor(activity, attempt(response))).outcome).toBe("unverified");
        }
    });
    it("does not turn draft observations, saved notes or unconfirmed transcriptions into a grade", async () => {
        const activity = (await loadCourseCatalog()).activities.find(item => item.method.kind === "writing_revision")!;
        const result = await runCourseTutor(activity, attempt("A claim without any source evidence."));
        expect(result).toMatchObject({ status: "review", outcome: "unverified", eligibleForKnowledge: false });
        expect((await runCourseTutor(activity, { ...attempt("Unconfirmed words"), confirmed: false })).status).toBe("needs_confirmation");
        expect((await runCourseTutor(activity, { ...attempt("A draft"), mode: "save" })).status).toBe("saved");
    });
    it("offers data and experimental design at three levels without grading causal interpretation", async () => {
        const { framework, activities } = await loadCourseCatalog();
        const investigation = activities.filter(item => item.skillId === "science.experimental_design" && item.method.kind === "science_explanation");
        expect(investigation.map(item => item.level)).toEqual(["middle_school", "high_school", "college_intro"]);
        expect(framework.competencies.find(item => item.id === "science.experimental_design")?.prerequisites).toContain("science.evidence_reasoning");
        for (const activity of investigation) {
            expect(activity.sources).toHaveLength(1);
            expect(activity.sources[0].trainingPermission).toBe("excluded");
            const result = await runCourseTutor(activity, attempt(`The record states "${activity.sources[0].text.slice(0, 62)}". This may have another explanation.`));
            expect(result).toMatchObject({ status: "review", outcome: "unverified", eligibleForKnowledge: false });
            expect(result.quotes[0]?.status).toBe("exact");
        }
    });
    it("checks a bounded numerical comparison without judging its causal explanation or calling a model", async () => {
        const network = vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("network_forbidden"); });
        try {
            const activity = (await loadCourseCatalog()).activities.find(item => item.method.kind === "science_data_comparison")!;
            expect(activity.id).toBe("course-practice-v2:science-investigation-high-school:compare-means");
            expect(activity.sources[0].trainingPermission).toBe("excluded");
            expect((await runCourseTutor(activity, attempt("42, 55, 13")))).toMatchObject({
                status: "checked", outcome: "matches", providerCalled: false, eligibleForKnowledge: false,
            });
            expect((await runCourseTutor(activity, attempt("42, 55, -13"))).outcome).toBe("revise");
            for (const response of ["42,55", "42,55,13 because the catalyst caused it", "42,55,1e999", "NaN,55,13", "42,55,13,0", "42,55,13.123", "1000001,55,13"]) {
                expect((await runCourseTutor(activity, attempt(response)))).toMatchObject({ status: "unsupported", outcome: "unverified" });
            }
            expect((await runCourseTutor(activity, { ...attempt("42, 55, 13"), confirmed: false })).status).toBe("needs_confirmation");
            expect((await runCourseTutor(activity, { ...attempt(""), mode: "hint" })).assistance).toBe("hinted");
            expect(network).not.toHaveBeenCalled();
        } finally { network.mockRestore(); }
    });
    it("rejects unsupported data specifications and preserves existing investigation revisions", async () => {
        const { framework, activities } = await loadCourseCatalog();
        expect(activityMethodSchema.safeParse({kind:"science_data_comparison",groups:[{label:"A",values:[1]},{label:"B",values:[2,3]}],unit:"seconds",decimalPlaces:0}).success).toBe(false);
        const activity = activities.find(item => item.method.kind === "science_data_comparison")!;
        const { versionId: _versionId, ...unversioned } = activity;
        void _versionId;
        const invalid = { ...unversioned, method: { ...activity.method, groups: [{label:"same",values:[42,40,44]},{label:"same",values:[56,54,55]}] } };
        await expect(validateCourseActivities(framework, [invalid])).rejects.toThrow("duplicate_comparison_group");
        const unsupportedSource = { ...unversioned, method: { ...activity.method, groups: [{label:"Catalyst A",values:[42,40,999]},{label:"No catalyst",values:[56,54,55]}] } };
        await expect(validateCourseActivities(framework, [unsupportedSource])).rejects.toThrow("unsupported_comparison_source");
        expect(activities.filter(item => item.id.endsWith(":data") && item.skillId === "science.experimental_design").map(item => item.versionId)).toEqual([
            "1881c38b0f6291798eef49575ccbb3694d038629ef8acf713a6ca004ece34acf",
            "a800fb6cc71889d7dd0ddb6f7860a83e9098f7aa302806c46db05a84ddafc751",
            "b583c8250c433389b0b15090ccf1359b46f2722296bd5ee195df5e462f6671e7",
        ]);
    });
});
