"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import type {
  LobbyCheckInValue,
  LobbyEnergy,
  LobbyMeals,
  LobbySleep,
} from "@/lib/dashboard/lobby-check-in";
import { saveLobbyCheckIn } from "./actions";

const ENERGY_OPTIONS: ReadonlyArray<{
  value: LobbyEnergy;
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "okay", label: "Okay" },
  { value: "good", label: "Good" },
];

const SLEEP_OPTIONS: ReadonlyArray<{
  value: LobbySleep;
  label: string;
}> = [
  { value: "under_5", label: "3-4 hr" },
  { value: "five_to_six", label: "4-6 hr" },
  { value: "seven_to_nine", label: "7-9 hr" },
];

const MEAL_OPTIONS: ReadonlyArray<{
  value: LobbyMeals;
  label: string;
}> = [
  { value: "not_yet", label: "Not yet" },
  { value: "snack", label: "Snack" },
  { value: "meal", label: "Meal" },
];

type SaveState = "choosing" | "saving" | "saved" | "error";

export function LobbyCheckIn({
  initialValue,
  sleepDate,
  primary = false,
}: {
  initialValue: LobbyCheckInValue | null;
  sleepDate: string;
  primary?: boolean;
}) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [energy, setEnergy] = useState<LobbyEnergy | null>(
    initialValue?.energy ?? null,
  );
  const [sleep, setSleep] = useState<LobbySleep | null>(
    initialValue?.sleep ?? null,
  );
  const [meals, setMeals] = useState<LobbyMeals | null>(
    initialValue?.meals ?? null,
  );
  const [saveState, setSaveState] = useState<SaveState>(
    initialValue ? "saved" : "choosing",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) return;

    const animationFrame = window.requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLButtonElement>(
          ".sd-lobby-checkin-row button, .sd-lobby-checkin-summary button",
        )
        ?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!energy || !sleep || !meals || saveState !== "choosing") return;

    const timer = window.setTimeout(() => {
      setSaveState("saving");
      setMessage(null);
      startTransition(async () => {
        const result = await saveLobbyCheckIn({
          energy,
          sleep,
          meals,
          sleepDate,
        });
        if (!result.ok) {
          setSaveState("error");
          setMessage(result.error);
          setIsOpen(true);
          return;
        }
        setSaveState("saved");
        setIsOpen(false);
        router.refresh();
      });
    }, 650);

    return () => window.clearTimeout(timer);
  }, [energy, meals, router, saveState, sleep, sleepDate]);

  function closeCheckIn() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function changeSelection() {
    setEnergy(null);
    setSleep(null);
    setMeals(null);
    setMessage(null);
    setSaveState("choosing");
    setIsOpen(true);
  }

  function choose<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setMessage(null);
    setSaveState("choosing");
  }

  const summary = [
    ENERGY_OPTIONS.find((option) => option.value === energy)?.label,
    SLEEP_OPTIONS.find((option) => option.value === sleep)?.label,
    MEAL_OPTIONS.find((option) => option.value === meals)?.label,
  ]
    .filter(Boolean)
    .join(" | ");
  const showSummary = saveState === "saved" || saveState === "saving";
  const triggerLabel =
    saveState === "saving"
      ? "Saving"
      : saveState === "saved"
        ? "Checked in"
        : "Check-In";

  return (
    <section className="sd-lobby-checkin" data-primary={primary || undefined}>
      <button
        ref={triggerRef}
        type="button"
        className="sd-lobby-checkin-trigger"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls="lobby-checkin-panel"
        onClick={() => setIsOpen((open) => !open)}
      >
        {saveState === "saved" ? (
          <Check size={14} strokeWidth={3} aria-hidden="true" />
        ) : null}
        <span>{triggerLabel}</span>
        <ChevronDown
          size={14}
          strokeWidth={2.4}
          aria-hidden="true"
          className={isOpen ? "is-open" : undefined}
        />
      </button>

      {isOpen ? (
        <div
          ref={panelRef}
          id="lobby-checkin-panel"
          className="sd-lobby-checkin-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="lobby-checkin-title"
        >
          <div className="sd-lobby-checkin-header">
            <h2 id="lobby-checkin-title">Check-In</h2>
            <button
              type="button"
              className="sd-lobby-checkin-close"
              aria-label="Close check-in"
              onClick={closeCheckIn}
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>

          {showSummary ? (
            <div className="sd-lobby-checkin-summary" aria-live="polite">
              <div>
                <strong>{pending ? "Saving check-in" : "Check-in saved"}</strong>
                <span>{summary}</span>
              </div>
              <button type="button" onClick={changeSelection} disabled={pending}>
                Change
              </button>
            </div>
          ) : (
            <div className="sd-lobby-checkin-rows">
              <CheckInRow
                label="Energy"
                options={ENERGY_OPTIONS}
                selected={energy}
                disabled={pending}
                onSelect={(value) => choose(setEnergy, value)}
              />
              <CheckInRow
                label="Sleep"
                options={SLEEP_OPTIONS}
                selected={sleep}
                disabled={pending}
                onSelect={(value) => choose(setSleep, value)}
              />
              <CheckInRow
                label="Meals"
                options={MEAL_OPTIONS}
                selected={meals}
                disabled={pending}
                onSelect={(value) => choose(setMeals, value)}
              />
            </div>
          )}

          {message ? (
            <p className="sd-lobby-checkin-message" role="status">
              {message}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function CheckInRow<T extends string>({
  label,
  options,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  options: ReadonlyArray<Readonly<{ value: T; label: string }>>;
  selected: T | null;
  disabled: boolean;
  onSelect: (value: T) => void;
}) {
  return (
    <fieldset className="sd-lobby-checkin-row">
      <legend>{label}</legend>
      <div>
        {options.map((option) => {
          const active = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onSelect(option.value)}
            >
              {active ? (
                <Check size={13} strokeWidth={3} aria-hidden="true" />
              ) : null}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
