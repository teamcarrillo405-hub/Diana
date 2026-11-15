import { COURSE_ACTIVITY_VERSION, type CourseActivity } from "./course-activities";
import type { Competency, CourseLevel, CourseMap } from "./course-framework";

const levels = ["middle_school", "high_school", "college_intro"] as const satisfies readonly CourseLevel[];

export const investigationCompetencies: Competency[] = [{
    id: "science.experimental_design",
    subject: "science",
    title: "Investigations, data and alternatives",
    objective: "Read a small data record, distinguish its observation from a causal claim, and propose a comparison that addresses a named alternative explanation.",
    prerequisites: ["science.evidence_reasoning"],
    levels: [...levels],
    revision: 1,
}];

const cases = {
    middle_school: {
        title: "Compare plant growth records",
        sourceTitle: "Fictional classroom plant record",
        sourceText: "Authored practice data, not a published study. Six window plants received 8 hours of light per day and grew an average of 4 cm in two weeks. Six shelf plants received 4 hours of light per day and grew an average of 2 cm. All plants received the same amount of water. The shelf was beside a warm radiator; neither group's temperature was recorded.",
        prompt: "Use the plant record to describe the observed difference. Can this one comparison establish that light caused it? Name another variable and describe a fairer next comparison.",
        example: "Different example: two groups of seedlings receive the same light, but different amounts of water.",
        steps: ["Record the measured growth in each group before explaining it.", "To study water, keep other relevant conditions as similar as possible."],
    },
    high_school: {
        title: "Interpret a reaction-rate trial",
        sourceTitle: "Fictional reaction-rate trial",
        sourceText: "Authored practice data, not a published study. Three trials with catalyst A took 42, 40 and 44 seconds. Three trials without it took 56, 54 and 55 seconds. The catalyst trials were prepared at 28 degrees Celsius and the comparison trials at 22 degrees Celsius. The same volume and concentration of reagents were used. Reaction time was measured from mixing to a fixed color change.",
        prompt: "Compare the two recorded time ranges and evaluate the claim that catalyst A shortened the reaction. Identify the confounding variable, a controlled repeat and one measurement limit.",
        example: "Different example: two reaction groups use different concentrations and different catalysts.",
        steps: ["A difference in recorded times is an observation, not a causal estimate by itself.", "Hold concentration alike when isolating the effect of the catalyst."],
    },
    college_intro: {
        title: "Assess a study-design claim",
        sourceTitle: "Fictional study-space pilot",
        sourceText: "Authored practice data, not a published study. Twelve volunteers chose a quiet room; their session lengths in minutes had median 48 and range 25 to 72. Twelve other volunteers chose a shared room; their median was 39 and range 20 to 65. Room choice was self-selected. The pilot recorded session duration but no learning outcome, prior study habits or course workload.",
        prompt: "State what the pilot measured and the observed difference. Evaluate whether it supports a causal learning claim. Propose a feasible follow-up with a defined outcome and a way to address selection bias.",
        example: "Different example: volunteers choose either recorded lectures or live sessions, and only attendance is counted.",
        steps: ["Attendance is the measured outcome; learning has not been measured in that design.", "A follow-up must define learning evidence and account for who chose each setting."],
    },
} as const;

export const investigationCourses: CourseMap[] = levels.map(level => {
    const suffix = level.replaceAll("_", "-");
    const courseId = `science-investigation-${suffix}`;
    return {
        id: courseId,
        title: { middle_school: "Investigate with data", high_school: "Experimental design and data", college_intro: "Research design and inference", college_advanced: "Advanced investigation" }[level],
        subject: "science",
        level,
        revision: 1,
        units: [{ id: `${courseId}-unit`, title: "Data and alternative explanations", skillIds: ["science.experimental_design"] }],
        sources: [{ resourceId: `investigation-data-${suffix}`, edition: "Diana authored practice 1", unitId: `${courseId}-unit`, locator: `source:investigation-data-${suffix}` }],
        alignments: [],
    };
});

export const investigationActivities: CourseActivity[] = levels.map(level => {
    const suffix = level.replaceAll("_", "-");
    const item = cases[level];
    return {
        id: `${COURSE_ACTIVITY_VERSION}:science-investigation-${suffix}:data`,
        courseId: `science-investigation-${suffix}`,
        skillId: "science.experimental_design",
        subject: "science",
        level,
        title: item.title,
        prompt: item.prompt,
        method: {
            kind: "science_explanation",
            criteria: [
                "Describe the measured outcome and the observed group difference without adding an unmeasured result.",
                "Distinguish the observation from a causal explanation and name a specific alternative.",
                "Describe a follow-up comparison that addresses that alternative.",
                "State a remaining measurement or sampling limit.",
            ],
        },
        hints: ["Start with what was actually measured in each group.", "Find a condition or selection difference that could also explain the result, then plan how to address it."],
        example: { prompt: item.example, steps: [...item.steps] },
        sources: [{ id: `investigation-data-${suffix}`, title: item.sourceTitle, text: item.sourceText, authorship: "diana_authored", instructionRights: "original_practice", trainingPermission: "excluded" }],
        review: "pending",
        revision: 1,
    };
});

// Keep the original three explanation activities intact: their version hashes are
// independent of this additional, narrower arithmetic check.
investigationActivities.push({
    id: `${COURSE_ACTIVITY_VERSION}:science-investigation-high-school:compare-means`,
    courseId: "science-investigation-high-school",
    skillId: "science.experimental_design",
    subject: "science",
    level: "high_school",
    title: "Compare the recorded trial times",
    prompt: "Find the arithmetic mean for the catalyst A trials, the mean for the no-catalyst trials, and the difference (no-catalyst mean minus catalyst A mean), in seconds. Enter only those three numbers in that order, separated by commas. After the numerical check, consider the temperature difference before drawing a causal conclusion.",
    method: { kind: "science_data_comparison", groups: [
        { label: "Catalyst A", values: [42, 40, 44] },
        { label: "No catalyst", values: [56, 54, 55] },
    ], unit: "seconds", decimalPlaces: 0 },
    hints: ["Add each group's three recorded times, then divide each sum by three.", "Subtract the catalyst A mean from the no-catalyst mean. Keep the numerical result separate from any claim about its cause."],
    example: { prompt: "Different example: one group records 4, 6 and 8 seconds; another records 7, 9 and 11 seconds.", steps: ["The group means are 6 and 9 seconds.", "The second mean minus the first is 3 seconds. That arithmetic alone does not explain why the groups differ."] },
    sources: [{ id: "investigation-data-high-school", title: cases.high_school.sourceTitle, text: cases.high_school.sourceText, authorship: "diana_authored", instructionRights: "original_practice", trainingPermission: "excluded" }],
    review: "pending",
    revision: 1,
});
