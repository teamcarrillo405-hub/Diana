"use client";

import { useState, type FormEvent } from "react";

import { useBlockAutosave } from "@/components/assignment-native-tools";
import type { AssignmentArtifactBlockInput } from "@/lib/assignment-artifact";
import type { AssignmentArtifactType } from "@/lib/assignment-profile";
import { checkClassroomBalance, checkClassroomMolarity } from "@/lib/native-tools/classroom-chemistry";
import { checkMotionGraphCalculation, checkPolynomialCalculation, MOTION_DISTANCE_UNITS, MOTION_TIME_UNITS } from "@/lib/native-tools/graph-calculations";
import styles from "./student-shell/graph-work.module.css";

type Field = { key: string; label: string; hint?: string; multiline?: boolean; options?: readonly string[] };
type Check = { label: string; attemptKey: string; fields: readonly Field[] };
type Values = Record<string, string>;
type Feedback = { status: string; message: string; observations?: string[] };

const SUBJECTS = {
  calculus: {
    title: "Calculus checks",
    description: "Use the function from your assignment. These checks support polynomials in x and exact answers, including fractions.",
    shared: [{ key: "function", label: "Function", hint: "Example: x^2" }],
    checks: [
      { label: "Tangent slope", attemptKey: "slope", fields: [{ key: "point", label: "Point for tangent", hint: "Enter the x-value" }, { key: "slope", label: "Your slope" }] },
      { label: "Signed area", attemptKey: "integral", fields: [{ key: "lower", label: "Lower bound" }, { key: "upper", label: "Upper bound" }, { key: "integral", label: "Your integral" }] },
    ],
  },
  physics: {
    title: "Physics checks",
    description: "Copy two or more points from each graph. Use one time, value pair per line. Diana treats the segments between points as straight.",
    shared: [{ key: "distanceUnit", label: "Distance unit", options: MOTION_DISTANCE_UNITS }, { key: "timeUnit", label: "Time unit", options: MOTION_TIME_UNITS }],
    checks: [
      { label: "Average velocity", attemptKey: "velocity", fields: [
        { key: "position", label: "Position samples", multiline: true, hint: "Time, position" },
        { key: "positionFrom", label: "Position start time" }, { key: "positionTo", label: "Position end time" },
        { key: "velocity", label: "Your average velocity" }, { key: "slopeUnit", label: "Slope unit", hint: "Example: m/s" },
      ] },
      { label: "Displacement", attemptKey: "displacement", fields: [
        { key: "velocityPoints", label: "Velocity samples", multiline: true, hint: "Time, velocity" },
        { key: "velocityFrom", label: "Velocity start time" }, { key: "velocityTo", label: "Velocity end time" },
        { key: "displacement", label: "Your displacement" }, { key: "displacementUnit", label: "Displacement unit", hint: "Example: m" },
      ] },
    ],
  },
  chemistry: {
    title: "Chemistry checks",
    description: "Copy the equation and quantities from your worksheet. Check your balance and molar concentration here.",
    shared: [],
    checks: [
      { label: "Balance an equation", attemptKey: "balanced", fields: [
        { key: "equation", label: "Given equation", multiline: true, hint: "Use -> for the reaction arrow." },
        { key: "balanced", label: "Your balanced equation", multiline: true },
      ] },
      { label: "Calculate concentration", attemptKey: "concentration", fields: [
        { key: "amount", label: "Amount of solute", hint: "Include mol or mmol." },
        { key: "volume", label: "Solution volume", hint: "Include L or mL." },
        { key: "figures", label: "Significant figures" }, { key: "concentration", label: "Your concentration", hint: "Include M or mol/L." },
      ] },
    ],
  },
} satisfies Record<string, { title: string; description: string; shared: readonly Field[]; checks: readonly Check[] }>;

type StemSubject = keyof typeof SUBJECTS;

export function homeworkStemSubject(course: string, title: string): StemSubject | undefined {
  const subjects = /\b(calculus|physics|chemistry)\b/iu;
  return (subjects.exec(course)?.[1] ?? subjects.exec(title)?.[1])?.toLowerCase() as StemSubject | undefined;
}

function motionSamples(text: string) {
  return text.trim().split(/\r?\n/u).filter((line) => line.trim()).map((line) => {
    const [time, value, extra] = line.split(",");
    return { x: time, y: extra === undefined ? value ?? "" : "" };
  });
}

function evaluate(subject: StemSubject, index: number, v: Values): Feedback {
  if (subject === "calculus") {
    return index === 0
      ? checkPolynomialCalculation({ expression: v.function, operation: "tangent_slope", x: v.point }, { value: v.slope })
      : checkPolynomialCalculation({ expression: v.function, operation: "signed_area", from: v.lower, to: v.upper }, { value: v.integral });
  }
  if (subject === "physics") {
    const distanceUnit = MOTION_DISTANCE_UNITS.find((unit) => unit === v.distanceUnit);
    const timeUnit = MOTION_TIME_UNITS.find((unit) => unit === v.timeUnit);
    if (!distanceUnit || !timeUnit) return { status: "unsupported", message: "Choose the distance and time units printed on the graph." };
    return index === 0
      ? checkMotionGraphCalculation({ graph: "position_time", operation: "average_slope", points: motionSamples(v.position), from: v.positionFrom, to: v.positionTo, distanceUnit, timeUnit }, { value: v.velocity, unit: v.slopeUnit })
      : checkMotionGraphCalculation({ graph: "velocity_time", operation: "signed_area", points: motionSamples(v.velocityPoints), from: v.velocityFrom, to: v.velocityTo, distanceUnit, timeUnit }, { value: v.displacement, unit: v.displacementUnit });
  }
  const result = index === 0
    ? checkClassroomBalance(v.equation, v.balanced)
    : checkClassroomMolarity({ amount: v.amount, volume: v.volume, significantFigures: Number(v.figures), answer: v.concentration });
  return { status: result.status, message: result.guidance, observations: result.observations };
}

function savedValues(initial: AssignmentArtifactBlockInput | undefined, fields: readonly Field[]): Values {
  const saved = initial?.content.stemValues;
  const record = saved && typeof saved === "object" ? saved as Record<string, unknown> : {};
  return Object.fromEntries(fields.map(({ key, options }) => {
    const value = record[key];
    return [key, typeof value === "string" && (!options || options.includes(value)) ? value : ""];
  }));
}

function StemField({ field, value, onChange }: { field: Field; value: string; onChange: (value: string) => void }) {
  return (
    <label className={field.multiline ? styles.stemWideField : undefined}>
      {field.label}
      {field.options ? (
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Choose a unit</option>
          {field.options.map((option) => <option key={option}>{option}</option>)}
        </select>
      ) : field.multiline ? (
        <textarea rows={3} maxLength={2400} placeholder={field.hint} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input maxLength={300} placeholder={field.hint} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

export function HomeworkStemChecks({ assignmentId, artifactType, course, title, initial }: {
  assignmentId: string;
  artifactType: AssignmentArtifactType;
  course: string;
  title: string;
  initial?: AssignmentArtifactBlockInput;
}) {
  const subject = homeworkStemSubject(course, title);
  if (!subject) return null;
  return <StemChecks key={`${assignmentId}:${subject}`} {...{ assignmentId, artifactType, subject, initial }} />;
}

function StemChecks({ assignmentId, artifactType, subject, initial }: {
  assignmentId: string;
  artifactType: AssignmentArtifactType;
  subject: StemSubject;
  initial?: AssignmentArtifactBlockInput;
}) {
  const { title, description, shared, checks }: { title: string; description: string; shared: readonly Field[]; checks: readonly Check[] } = SUBJECTS[subject];
  const fields = [...shared, ...checks.flatMap((check) => check.fields)];
  const [values, setValues] = useState(() => savedValues(initial, fields));
  const [checked, setChecked] = useState<number[]>(() => {
    const saved = initial?.content.stemChecked;
    return Array.isArray(saved) ? saved.filter((index): index is number => index === 0 || index === 1) : [];
  });
  const [requested, setRequested] = useState<number[]>([]);
  const attempted = checks.filter((check) => values[check.attemptKey].trim());
  const handInFields = attempted.length ? [...shared, ...attempted.flatMap((check) => check.fields)] : [];
  const work = handInFields.flatMap(({ key, label }) => {
    const value = values[key].trim();
    return value ? [`${label}: ${value}`] : [];
  }).join("\n");
  const status = useBlockAutosave(assignmentId, artifactType, {
    key: "stem-checks",
    type: "equation",
    capability: "equation_editor",
    label: `${title.split(" ")[0]} work`,
    position: 94,
    content: { stemValues: values, stemChecked: checked, studentAuthoredText: work },
    plainText: work,
  });

  function change(field: Field, value: string, index?: number) {
    setValues((current) => ({ ...current, [field.key]: value }));
    setChecked((current) => index === undefined ? [] : current.filter((entry) => entry !== index));
    setRequested((current) => index === undefined ? [] : current.filter((entry) => entry !== index));
  }

  function checkAnswer(event: FormEvent<HTMLFormElement>, index: number) {
    event.preventDefault();
    const complete = [...shared, ...checks[index].fields].every(({ key }) => values[key].trim());
    if (complete) {
      setChecked((current) => current.includes(index) ? current : [...current, index]);
    } else {
      setRequested((current) => current.includes(index) ? current : [...current, index]);
    }
  }

  return (
    <section className={`${styles.root} ${styles.stemChecks}`} aria-labelledby="homework-stem-title">
      <div className={styles.heading}>
        <h2 id="homework-stem-title">{title}</h2>
        {status ? <span role="status">{status}</span> : null}
      </div>
      <p>{description}</p>
      {shared.length ? (
        <div className={styles.stemFields}>
          {shared.map((field) => <StemField key={field.key} field={field} value={values[field.key]} onChange={(value) => change(field, value)} />)}
        </div>
      ) : null}
      {checks.map((check, index) => {
        const feedback = checked.includes(index) ? evaluate(subject, index, values) : undefined;
        return (
          <form key={check.label} aria-label={check.label} className={styles.stemForm} onSubmit={(event) => checkAnswer(event, index)}>
            <h3>{check.label}</h3>
            <div className={styles.stemFields}>
              {check.fields.map((field) => <StemField key={field.key} field={field} value={values[field.key]} onChange={(value) => change(field, value, index)} />)}
            </div>
            <button type="submit" className={styles.primary}>Check answer</button>
            <div role="status">
              {feedback ? (
                <div className={styles.results}>
                  <p>{feedback.message}</p>
                  {feedback.observations?.length ? <ul>{feedback.observations.map((observation) => <li key={observation}>{observation}</li>)}</ul> : null}
                </div>
              ) : requested.includes(index) ? <p>Enter the given information and your answer to check it.</p> : null}
            </div>
          </form>
        );
      })}
    </section>
  );
}
