"use client";

import { BookOpen } from "lucide-react";
import { SubjectDonut } from "@/components/dashboard/today-graphics";
import { reviewSubjectColors } from "./preview-data";
import styles from "./today-study-mix-review.module.css";

export function TodayStudyMixReview({ subjects, unavailable }: {
  subjects: readonly { name: string; minutes: number; color: string }[];
  unavailable: boolean;
}) {
  return <div className={styles.mix} data-dense={subjects.length > 4 || undefined}>
    <header className={styles.heading}><p>This week / By subject</p><h2>Study Mix</h2></header>
    {unavailable ? <div className={styles.unavailable} role="status">
      <BookOpen size={32} strokeWidth={2.25} aria-hidden="true" />
      <h3>Study mix unavailable</h3>
      <p>Your subject totals will appear when the connection returns.</p>
    </div> : <>
      <SubjectDonut subjects={subjects} palette={subjects.map(subject => reviewSubjectColors[subject.name] ?? subject.color)} totalLabel="estimated" />
      {subjects.length > 0 && <p className={styles.caption}>Share of estimated assignment time this week</p>}
    </>}
  </div>;
}
