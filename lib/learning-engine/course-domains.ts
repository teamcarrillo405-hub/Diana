import { z } from "zod";
export const domainSchema = z.enum(["math", "reading", "english", "science", "history", "computing", "other"]);
export const courseLevelSchema = z.enum(["middle_school", "high_school", "college_intro", "college_advanced"]);
export type CourseLevel = z.infer<typeof courseLevelSchema>;
export type LearningDomain = z.infer<typeof domainSchema>;
export const LEVEL_LABELS: Record<CourseLevel, string> = { middle_school: "Grades 6–8", high_school: "Grades 9–12", college_intro: "Introductory college", college_advanced: "Advanced college" };
/** Only a starting filter. It never assigns a learner's ability or locks a subject. */
export function practiceSubjectForClass(category: string | null, name: string) {
    const subject = (category || name).trim().toLowerCase();
    if (/\b(computing|computer science|programming|informatics)\b/.test(subject)) return "computing";
    if (/\b(math|mathematics|algebra|geometry|calculus|statistics|precalculus)\b/.test(subject))
        return "math";
    if (/\b(science|biology|chemistry|physics|astronomy|geology)\b/.test(subject))
        return "science";
    if (/\b(history|civics|social studies|government)\b/.test(subject)) return "history";
    return "english";
}
/** A starting course context, never an inferred mastery level. Students can change it. */
export function practiceLevelForClass(category: string | null, name: string, schoolYear?: string | null): CourseLevel {
    const context = `${category ?? ""} ${name}`.toLowerCase();
    if (/\b(college|university|undergraduate)\b/.test(context)) return "college_intro";
    if (/\b(algebra|geometry|precalculus|calculus|chemistry|physics|biology)\b/.test(context)) return "high_school";
    if (/\b(freshman|sophomore|junior|senior|9th|10th|11th|12th)\b/i.test(schoolYear ?? "")) return "high_school";
    return "middle_school";
}
/** Only use an authored course when the class label clearly names its topic. */
export function practiceCourseForClass(category: string | null, name: string): string | undefined {
    const context = `${category ?? ""} ${name}`.toLowerCase();
    return /\b(algebra|linear equations?)\b/.test(context) && !/\bcollege\b/.test(context)
        ? "math-linear-equations-high-school" : undefined;
}
