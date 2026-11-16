import { ChevronDown } from "lucide-react";
import { useId, type CSSProperties } from "react";
import type { CheckInWeek } from "@/lib/wellness/check-in-week";
import styles from "./lobby-check-in-week.module.css";

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const dayFormat = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
const fullDateFormat = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

const energyLabels = { low: "Low", okay: "Okay", good: "Good" } as const;

export function LobbyCheckInWeek({ week }: { week: CheckInWeek }) {
  const heading = useId();
  const days = week.days.map(day => ({ ...day, calendarDay: new Date(`${day.date}T00:00:00Z`) }));
  const latest = days.at(-1);
  if (!latest) return null;

  const sleepScale = Math.max(12, ...days.map(day => Math.ceil(day.sleepHours ?? 0)));
  const activityScale = Math.max(60, ...days.map(day => Math.ceil((day.activityMinutes ?? 0) / 30) * 30));
  const missingLabel = week.unavailable ? "No value available" : "Not shared";

  return <details className={styles.history} aria-labelledby={heading} data-check-in-history>
    <summary id={heading} className={styles.summary}>
      <span>7-day history</span>
      <ChevronDown size={18} aria-hidden="true" />
    </summary>
    <p className={styles.range}><time dateTime={days[0].date}>{dateFormat.format(days[0].calendarDay)}</time> to <time dateTime={latest.date}>{dateFormat.format(latest.calendarDay)}</time></p>
    <table className={styles.chart}>
      <caption className={styles.srOnly}>Energy, sleep, and activity for the past seven days</caption>
      <colgroup><col className={styles.metricColumn} /><col span={days.length} /></colgroup>
      <thead><tr>
        <th scope="col"><span className={styles.srOnly}>Measure</span></th>
        {days.map(day => <th key={day.date} scope="col" data-current={day.date === latest.date || undefined}>
          <time dateTime={day.date}><span aria-hidden="true">{dayFormat.format(day.calendarDay)}</span><span className={styles.srOnly}>{fullDateFormat.format(day.calendarDay)}</span></time>
        </th>)}
      </tr></thead>
      <tbody>
        <tr>
          <th scope="row">Energy</th>
          {days.map(day => <td key={day.date}>
            <span className={styles.energyPlot} data-energy={day.energy ?? undefined} aria-hidden="true" />
            <span className={styles.value}>{day.energy ? energyLabels[day.energy] : <span className={styles.srOnly}>{missingLabel}</span>}</span>
          </td>)}
        </tr>
        <tr data-series="sleep">
          <th scope="row">Sleep <small>Hours</small></th>
          {days.map(day => <Measure key={day.date} value={day.sleepHours} scale={sleepScale} unit="hours" missingLabel={missingLabel} />)}
        </tr>
        <tr data-series="activity">
          <th scope="row">Activity <small>Minutes</small></th>
          {days.map(day => <Measure key={day.date} value={day.activityMinutes} scale={activityScale} unit="minutes" missingLabel={missingLabel} />)}
        </tr>
      </tbody>
    </table>
    <p className={styles.note}>{week.unavailable ? "Some records couldn’t load." : "Blank means no entry."}</p>
  </details>;
}

function Measure({ value, scale, unit, missingLabel }: { value: number | null; scale: number; unit: "hours" | "minutes"; missingLabel: string }) {
  return <td>
    <span className={styles.measurePlot} aria-hidden="true">
      {value !== null && <i data-zero={value === 0 || undefined} style={{ "--bar-height": `${value / scale * 100}%` } as CSSProperties} />}
    </span>
    <span className={styles.value}>{value === null
      ? <span className={styles.srOnly}>{missingLabel}</span>
      : <><span aria-hidden="true">{value}</span><span className={styles.srOnly}>{value} {unit}</span></>}
    </span>
  </td>;
}
