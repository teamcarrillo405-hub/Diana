"use client";

import { useId, type CSSProperties } from "react";
import { BookCheck, HeartPulse, Hourglass, Library, PackageCheck, Send } from "lucide-react";
import type { getAchievements } from "@/lib/dashboard/achievements";
import { DianaWeeklyTrophy } from "./diana-weekly-trophy";
import type { PreviewWeeklyAward } from "./use-preview-weekly-award";
import styles from "./today-achievements-review.module.css";

export type Achievement = ReturnType<typeof getAchievements>[number];
const materials = {
  "first-finish": { accent: "#52efbd", light: "#d1ffed", dark: "#125947", ink: "#19533f", Icon: BookCheck },
  "first-check-in": { accent: "#61d9f6", light: "#defaff", dark: "#235969", ink: "#20576a", Icon: HeartPulse },
  "handed-in": { accent: "#f2c16d", light: "#fff1d8", dark: "#6d4b27", ink: "#765013", Icon: Send },
  "five-finished": { accent: "#ff9f8c", light: "#ffe4dc", dark: "#733d36", ink: "#863e31", Icon: Library },
  "ten-sessions": { accent: "#8dadff", light: "#e5edff", dark: "#304d83", ink: "#335995", Icon: Hourglass },
  "five-submitted": { accent: "#c4e86e", light: "#f2ffcf", dark: "#506124", ink: "#53651e", Icon: PackageCheck },
};

function materialStyle(item: Achievement): CSSProperties {
  return { "--emblem-accent": materials[item.id].accent, "--emblem-ink": materials[item.id].ink } as CSSProperties;
}

function AchievementEmblem({ achievement }: { achievement: Achievement }) {
  const id = useId();
  const { accent, light, dark, Icon } = materials[achievement.id];
  return <svg className={styles.emblem} viewBox="0 0 160 176" aria-hidden="true" focusable="false" data-emblem={achievement.id} data-earned={!!achievement.earnedAt}>
    <defs>
      <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e7f0ed" /><stop offset=".26" stopColor="#738d8a" /><stop offset=".5" stopColor="#1e3032" /><stop offset=".74" stopColor="#a6bab5" /><stop offset="1" stopColor="#3b5555" /></linearGradient>
      <linearGradient id={`${id}-edge`} x1="0" y1="0" x2=".8" y2="1"><stop stopColor={light} /><stop offset=".46" stopColor={accent} /><stop offset="1" stopColor={dark} /></linearGradient>
      <linearGradient id={`${id}-face`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#304746" /><stop offset=".55" stopColor="#142529" /><stop offset="1" stopColor="#0c161c" /></linearGradient>
    </defs>
    <path d="M80 12 145 48v73l-65 40-65-40V48Z" fill="#050d11" opacity=".65" transform="translate(0 5)" />
    <path d="M80 8 145 45v73l-65 40-65-40V45Z" fill={`url(#${id}-metal)`} />
    <path d="M80 15 139 49v65l-59 36-59-36V49Z" fill={`url(#${id}-edge)`} />
    <path d="M80 21 134 52v59l-54 33-54-33V52Z" fill={`url(#${id}-face)`} stroke="#0b171d" strokeWidth="2" />
    <path d="M80 29 127 56v51l-47 28-47-28V56Z" fill="none" stroke={accent} strokeOpacity=".32" />
    <path d="m26 52 54-31 54 31M21 114l59 36 59-36" fill="none" stroke={light} strokeOpacity=".65" />
    <Icon x="57" y="54" width="46" height="46" color={light} strokeWidth="1.8" />
    <path d="m39 121 41 24 41-24v13l-41 25-41-25Z" fill={`url(#${id}-edge)`} />
    {achievement.tier === 2 && <path d="m43 108 37 22 37-22v8l-37 23-37-23Z" fill={`url(#${id}-edge)`} />}
  </svg>;
}

function earnedDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

export function AchievementDetails({ achievement }: { achievement: Achievement }) {
  const progress = achievement.progress === null ? null : Math.min(achievement.progress, achievement.target);
  return <div className={styles.detail} style={materialStyle(achievement)}>
    <div className={styles.detailArt}><AchievementEmblem achievement={achievement} /></div>
    <div><p className={styles.requirement}>{achievement.requirement}</p>
      {achievement.earnedAt ? <p className={styles.earnedDate}>Earned <time dateTime={achievement.earnedAt}>{earnedDate(achievement.earnedAt)}</time></p> : <div className={styles.progress}>
        <span>{progress === null ? "Progress unavailable" : `${progress} of ${achievement.target} complete`}</span>
        {progress !== null && <progress aria-label={`${achievement.title} progress`} max={achievement.target} value={progress} />}
      </div>}
    </div>
  </div>;
}

export function TodayAchievementsReview({ achievements, weeklyAward, onInspect, storageUnavailable = false }: {
  achievements: readonly Achievement[];
  weeklyAward: PreviewWeeklyAward;
  onInspect: (achievement: Achievement, origin: HTMLButtonElement) => void;
  storageUnavailable?: boolean;
}) {
  const earned = achievements.filter(item => item.earnedAt).length;
  const unavailable = achievements.every(item => item.progress === null);
  const weeklyEarned = weeklyAward.state === "earned";
  const weeklyProgress = Math.min(weeklyAward.completed, weeklyAward.target);

  return <div className={styles.collection} data-achievements-review>
    <header className={styles.heading}><div><p>Your collection</p><h2>Achievements</h2></div></header>
    <section className={styles.featured} aria-label="This week's award" data-weekly-award={weeklyAward.state}>
      <div className={styles.featuredArt}><DianaWeeklyTrophy earned={weeklyEarned} /></div>
      <div className={styles.featuredCopy}>
        <p className={styles.category}>This week&apos;s award <span>{weeklyAward.weekLabel}</span></p>
        <h3>The Diana Award</h3>
        <p className={styles.requirement}>{weeklyAward.state === "no-goal" ? "Your weekly award begins with a plan." : "Complete your weekly assignment goal."}</p>
        {weeklyAward.state === "unavailable" ? <p className={styles.weeklyStatus}>Weekly progress unavailable</p> : weeklyAward.state === "no-goal" ? <p className={styles.weeklyStatus}>No assignments planned this week</p> : weeklyEarned ? <p className={styles.weeklyEarned}>Award earned <span>{weeklyAward.target} assignments complete</span></p> : <div className={styles.weeklyProgress}>
          <p><strong>{weeklyProgress}<span> / {weeklyAward.target}</span></strong><span>assignments complete</span></p>
          <progress aria-label="Weekly award progress" max={weeklyAward.target} value={weeklyProgress} />
        </div>}
      </div>
    </section>
    <div className={styles.collectionHeading}><h3>Lifetime badges</h3><span>{unavailable ? "--" : earned}<small> / {achievements.length} earned</small></span></div>
    <div className={styles.records} role="group" aria-label="Achievement collection">
      {achievements.map(item => <button type="button" key={item.id} className={styles.record}
        style={materialStyle(item)} aria-haspopup="dialog"
        aria-label={`${item.title}. ${item.earnedAt ? `Earned ${earnedDate(item.earnedAt)}` : item.progress === null ? "Progress unavailable" : `${Math.min(item.progress, item.target)} of ${item.target} complete`}. ${item.requirement}`}
        data-earned={!!item.earnedAt} data-award-color={materials[item.id].accent} onClick={event => onInspect(item, event.currentTarget)}>
        <span className={styles.badgeArt}><AchievementEmblem achievement={item} /></span>
        <span className={styles.recordCopy}><strong>{item.title}</strong><span>{item.earnedAt ? "Earned" : item.progress === null ? "Unavailable" : `${Math.min(item.progress, item.target)} / ${item.target}`}</span></span>
      </button>)}
    </div>
    <p className={styles.caption} role={unavailable || storageUnavailable ? "status" : undefined}>{unavailable ? "Your achievement history is temporarily unavailable." : storageUnavailable ? "Preview storage is unavailable. Changes last until this page closes." : "Yours to keep. Achievements do not reset each week."}</p>
  </div>;
}
