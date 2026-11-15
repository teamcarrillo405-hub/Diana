import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadCourseCatalog } from "../../lib/learning-engine/course-catalog";
import { CAPABILITIES } from "../../lib/learning-engine/course-activities";
import { courseContentHash } from "../../lib/learning-engine/course-framework";
import { buildCoursePaths } from "../../lib/learning-engine/course-sequence";
import { courseCoverageReport } from "../../lib/learning-engine/course-coverage";
import { offlineCurriculumCoverageReport } from "../../lib/learning-engine/curriculum-coverage-plan";
import { transferOriginActivityIds } from "../../lib/learning-engine/course-transfer";
async function main() {
const args = process.argv.slice(2);
if (args.some(arg => arg !== "--coverage-only") || args.length > 1) throw new Error("unknown_course_gate_argument");
const coverageOnly = args.includes("--coverage-only");
const originalFetch = globalThis.fetch;
let networkAttempts = 0;
globalThis.fetch = async () => { networkAttempts++; throw new Error("network_forbidden"); };
try {
    const { framework, activities } = await loadCourseCatalog(), checks = [];
    if (coverageOnly) {
        const curriculumPlanning = offlineCurriculumCoverageReport(framework, activities, new Set(Object.keys(transferOriginActivityIds)));
        if (networkAttempts) throw new Error("network_attempted");
        const report = { version: "diana-course-coverage-v1", createdAt: new Date().toISOString(), status: "reported",
            gateExecuted: false, frameworkHash: await courseContentHash(framework),
            activityInventoryHash: await courseContentHash(curriculumPlanning.activityInventory),
            competencies: framework.competencies.length, courses: framework.courses.length, activities: activities.length,
            networkAttempts, curriculumPlanning, qualification: "Offline metadata inventory only. No course tutor checks, hosted publication evidence or educator approval." };
        const directory = join(process.cwd(), "artifacts/learning-engine/curriculum-coverage");
        await mkdir(directory, { recursive: true });
        const path = join(directory, "coverage-" + Date.now() + ".json");
        await writeFile(path, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
        console.log(JSON.stringify({ status: report.status, gateExecuted: false, courses: report.courses,
            activities: report.activities, networkAttempts, ...curriculumPlanning.summary, path }));
        return;
    }
    // Metadata reporting does not load authored answer fixtures or execute tutor checks.
    const [{ runCourseTutor }, { EXPANSION_GATE_ANSWERS }, { TRANSFER_GATE_ANSWERS }, { FOUNDATION_GATE_ANSWERS }, { GAP_COMPLETION_GATE_ANSWERS }, { STOCHASTIC_GATE_ANSWERS }] = await Promise.all([
        import("../../lib/learning-engine/course-tutor"),
        import("../../lib/learning-engine/course-expansion-fixtures"),
        import("../../lib/learning-engine/course-transfer-fixtures"),
        import("../../lib/learning-engine/course-foundations-fixtures"),
        import("../../lib/learning-engine/course-gap-completion"),
        import('../../lib/learning-engine/course-stochastic-fixtures'),
    ]);
    for (const activity of activities) {
        const input = { confirmed: true, priorSupport: 0, mode: "check" as const, response: "" };
        const suffix = activity.id.split(":").at(-1);
        const mathAnswers:Record<string,string>={ratio:"2/5",mean:"6",function:"6",roots:"3,-2",rectangle:"24 cm^2",triangle:"30 cm^2",angle:"60 degrees",solve:"5"};
        if (activity.method.kind === "math_exact" && !mathAnswers[suffix ?? ""] && !EXPANSION_GATE_ANSWERS[activity.id] && !TRANSFER_GATE_ANSWERS[activity.id] && !FOUNDATION_GATE_ANSWERS[activity.id])
            throw new Error("missing_math_gate_fixture:" + activity.id);
        switch (activity.method.kind) {
            case "science_graph": input.response = { middle_school: "8", high_school: "-12", college_intro: "5/3", college_advanced: "" }[activity.level]; break;
            case "science_data_comparison": input.response = "42, 55, 13"; break;
            case "science_dimensions": input.response = { middle_school: "3.00 m/s", high_school: "2.50 g/cm^3", college_intro: "6.00 N", college_advanced: "" }[activity.level]; break;
            case "science_ionic": input.response = "1,1,1,1"; break;
            case "science_quantity": input.response = { middle_school: "2.50 m", high_school: "75.0 g", college_intro: "2.50 mL", college_advanced: "" }[activity.level]; break;
            case "science_balance": input.response = "2H2 + O2 -> 2H2O"; break;
            case "math_exact": input.response = mathAnswers[suffix ?? ""]; break;
            default: input.response = activity.sources.map(source => '"' + source.text.slice(-100) + '"').join(" ") + " I still need to explain why this evidence supports my claim.";
        }
        if (EXPANSION_GATE_ANSWERS[activity.id]) input.response = EXPANSION_GATE_ANSWERS[activity.id];
        if (TRANSFER_GATE_ANSWERS[activity.id]) input.response = TRANSFER_GATE_ANSWERS[activity.id];
        if (FOUNDATION_GATE_ANSWERS[activity.id]) input.response = FOUNDATION_GATE_ANSWERS[activity.id];
        if (GAP_COMPLETION_GATE_ANSWERS[activity.id]) input.response = GAP_COMPLETION_GATE_ANSWERS[activity.id];
        if (activity.method.kind === 'math_row_stochastic') {
            if (!STOCHASTIC_GATE_ANSWERS[activity.id]) throw new Error('missing_stochastic_gate_fixture');
            input.response = STOCHASTIC_GATE_ANSWERS[activity.id];
        }
        const result = await runCourseTutor(activity, input), hint = await runCourseTutor(activity, { ...input, mode: "hint" });
        if (result.eligibleForKnowledge || result.providerCalled || hint.assistance !== "hinted")
            throw new Error("evidence_gate_regression");
        const exact = ["math_exact", "math_row_stochastic", "science_quantity", "science_balance", "science_dimensions", "science_ionic", "science_data_comparison", "science_graph"].includes(activity.method.kind);
        if (exact && result.outcome !== "matches" || !exact && result.outcome !== "unverified")
            throw new Error("unexpected_outcome:" + activity.id);
        checks.push({ activityId: activity.id, versionId: activity.versionId, subject: activity.subject, course: activity.courseId, level: activity.level, method: activity.method.kind, evidenceMode: CAPABILITIES[activity.method.kind].check, outcome: result.outcome, review: activity.review });
    }
    if (networkAttempts)
        throw new Error("network_attempted");
    const paths = buildCoursePaths(framework, activities);
    const curriculumPlanning = offlineCurriculumCoverageReport(framework, activities, new Set(Object.keys(transferOriginActivityIds)));
    const report = { version: "diana-course-gate-v1", createdAt: new Date().toISOString(), status: "passed", frameworkHash: await courseContentHash(framework), competencies: framework.competencies.length, courses: new Set(activities.map(item => item.courseId)).size, activities: activities.length, networkAttempts, checks, paths, coverage: courseCoverageReport(framework, activities), curriculumPlanning, qualification: "Engineering fixtures only. No educator approval, model comparison or student learning gains." };
    const directory = join(process.cwd(), "artifacts/learning-engine/research/course-gate");
    await mkdir(directory, { recursive: true });
    const path = join(directory, "gate-" + Date.now() + ".json");
    await writeFile(path, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
    console.log(JSON.stringify({ status: report.status, courses: report.courses, activities: report.activities, competencies: report.competencies, networkAttempts, curriculumCoverage: curriculumPlanning.summary, path }));
}
finally {
    globalThis.fetch = originalFetch;
}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
