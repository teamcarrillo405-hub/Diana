"use client";
import { useState } from "react";
import styles from "./today-progress-review.module.css";
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export function WeeklyRunway({ planned, studied, unavailable, initialDay = 2 }: {
  planned: readonly number[];
  studied: readonly number[];
  unavailable: boolean;
  initialDay?: number;
}) {
  const [selected, setSelected] = useState(initialDay);
  const scale = Math.max(60, Math.ceil(Math.max(...planned, ...studied) / 30) * 30);
  const selectedDay = weekDays[selected];
  const selectedPlanned = planned[selected] ?? 0;
  const selectedStudied = studied[selected] ?? 0;

  return <section className={styles.runway} aria-label="Weekly study activity">
    <div className={styles.runwayHeading} data-runway-heading>
      <span>Study activity</span>
      <span>{scale} min scale</span>
    </div>
    <div className={styles.runwayPlot} data-runway-plot>
      <span className={styles.runwayGrid} aria-hidden="true" />
      <div className={styles.runwayColumns}>
        {weekDays.map((day, index) => {
          const plannedHeight = `${((planned[index] ?? 0) / scale) * 100}%`;
          const studiedHeight = unavailable ? "0%" : `${((studied[index] ?? 0) / scale) * 100}%`;
          const active = selected === index;
          return <button
            type="button"
            key={day}
            className={styles.runwayDay}
            aria-pressed={active}
            data-current={index === initialDay || undefined}
            onClick={() => setSelected(index)}
            onFocus={() => setSelected(index)}
            onMouseEnter={() => setSelected(index)}
            aria-label={`${day}: ${planned[index] ?? 0} minutes planned, ${unavailable ? "study time unavailable" : `${studied[index] ?? 0} minutes studied`}`}
          >
            <span className={styles.runwayColumn} aria-hidden="true">
              <span className={styles.runwayPlanned} style={{ height: plannedHeight }} />
              <span className={styles.runwayStudied} data-runway-studied style={{ height: studiedHeight }} />
            </span>
            <span className={styles.runwayLabel} data-runway-label>{day}</span>
          </button>;
        })}
      </div>
    </div>
    <div className={styles.runwayFooter} data-runway-footer>
      <span className={styles.runwayLegend} aria-hidden="true"><i /><span>planned</span><i /><span>studied</span></span>
      <p aria-live="polite">{selectedDay} <b>{selectedPlanned}m</b> planned <span>/</span> {unavailable ? "Unavailable" : <><b>{selectedStudied}m</b> studied</>}</p>
    </div>
  </section>;
}

