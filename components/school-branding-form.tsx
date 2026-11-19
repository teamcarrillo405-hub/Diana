"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { forwardRef, useId, useImperativeHandle, useRef, useState, useTransition, type FormEvent } from "react";
import { saveSchoolBranding } from "@/app/(app)/settings/school-branding-actions";

export type SchoolBrandingValues = {
  schoolName?: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  logoDataUrl: string | null;
};

export type SchoolBrandingFormHandle = { saveIfChanged: () => Promise<boolean> };

const colorPattern = /^#[0-9a-f]{6}$/i;
const logoTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxLogoBytes = 1_200_000;

/** Shared by onboarding and settings. Changes are saved only when requested. */
export const SchoolBrandingForm = forwardRef<SchoolBrandingFormHandle, {
  initialSchoolBranding: SchoolBrandingValues;
  onSaved?: () => void;
  disabled?: boolean;
  refreshOnSave?: boolean;
}>(function SchoolBrandingForm({
  initialSchoolBranding,
  onSaved,
  disabled = false,
  refreshOnSave = true,
}, ref) {
  const router = useRouter();
  const id = useId();
  const [schoolName, setSchoolName] = useState(initialSchoolBranding.schoolName ?? "");
  const [primary, setPrimary] = useState(initialSchoolBranding.primaryColor ?? "");
  const [secondary, setSecondary] = useState(initialSchoolBranding.secondaryColor ?? "");
  const [logo, setLogo] = useState(initialSchoolBranding.logoDataUrl);
  const [reading, setReading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const saving = useRef(false);
  const logoProblem = useRef(false);
  const lastSaved = useRef(initialSchoolBranding);
  const busy = pending || reading || disabled;

  function selectLogo(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    if (!logoTypes.has(file.type) || file.size > maxLogoBytes) {
      logoProblem.current = true;
      setMessage("Choose a PNG, JPG, or WebP image no larger than 1.2 MB.");
      return;
    }
    logoProblem.current = false;
    setReading(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setLogo(reader.result);
      else { logoProblem.current = true; setMessage("The logo could not be read. Try another image."); }
      setReading(false);
    };
    reader.onerror = () => { logoProblem.current = true; setMessage("The logo could not be read. Try another image."); setReading(false); };
    reader.readAsDataURL(file);
  }

  async function saveIfChanged(): Promise<boolean> {
    if (reading) { setMessage("Please wait for your logo to finish loading."); return false; }
    if (logoProblem.current) { setMessage("Choose a PNG, JPG, or WebP image no larger than 1.2 MB."); return false; }
    if (saving.current) return false;
    const first = primary.trim();
    const second = secondary.trim();
    if ((first && !colorPattern.test(first)) || (second && !colorPattern.test(second))) {
      setMessage("Enter a six-digit color code, such as #764099, or leave it blank.");
      return false;
    }
    const values = { schoolName: schoolName.trim() || null, primaryColor: first || null, secondaryColor: second || null, logoDataUrl: logo };
    if (values.schoolName === (lastSaved.current.schoolName ?? null) && values.primaryColor === lastSaved.current.primaryColor && values.secondaryColor === lastSaved.current.secondaryColor && values.logoDataUrl === lastSaved.current.logoDataUrl) return true;
    setMessage(null);
    saving.current = true;
    try {
      const result = await saveSchoolBranding(values);
      if (!result.ok) { setMessage(result.error); return false; }
      lastSaved.current = values;
      setMessage("School look saved.");
      if (refreshOnSave) router.refresh();
      onSaved?.();
      return true;
    } catch {
      setMessage("Your school look could not be saved. Please try again.");
      return false;
    } finally {
      saving.current = false;
    }
  }

  useImperativeHandle(ref, () => ({ saveIfChanged }));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const save = saveIfChanged();
    startTransition(async () => {
      if (await save) setMessage("School look saved.");
    });
  }

  return (
    <section className="space-y-3" aria-labelledby={`${id}-heading`}>
      <div>
        <h2 id={`${id}-heading`} className="text-lg font-semibold">Your school look</h2>
        <p className="text-sm text-muted">Optional. Add your school name, colors, and logo to personalize your Lobby. You can change or remove them anytime.</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor={`${id}-school-name`} className="block text-sm font-medium">School name</label>
          <input id={`${id}-school-name`} type="text" value={schoolName} disabled={busy} onChange={event => { setSchoolName(event.target.value); setMessage(null); }} placeholder="For example, Tigard High School" maxLength={80} className="h-11 w-full max-w-sm rounded border border-border bg-surface-soft px-3 text-sm text-fg" />
          <p className="text-xs text-muted">Your Lobby will show your school as a campus name.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          {([
            { key: "primary", label: "First school color", value: primary, set: setPrimary, fallback: "#764099" },
            { key: "secondary", label: "Second school color", value: secondary, set: setSecondary, fallback: "#d8b36a" },
          ] as const).map(({ key, label, value, set, fallback }) => (
            <div key={key} className="space-y-1">
              <label htmlFor={`${id}-${key}`} className="block text-sm font-medium">{label}</label>
              <div className="flex items-center gap-2">
                <input type="color" aria-label={`Pick ${label.toLowerCase()}`} value={colorPattern.test(value) ? value : fallback} disabled={busy} onChange={event => { set(event.target.value); setMessage(null); }} className="h-11 w-12 cursor-pointer rounded border border-border bg-surface-soft p-1" />
                <input id={`${id}-${key}`} type="text" value={value} disabled={busy} onChange={event => { set(event.target.value); setMessage(null); }} placeholder="Not set" maxLength={7} spellCheck={false} className="h-11 w-28 rounded border border-border bg-surface-soft px-2 text-sm text-fg" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <label htmlFor={`${id}-logo`} className="block text-sm font-medium">School logo</label>
          {logo ? <Image src={logo} alt="Selected school logo" width={72} height={72} unoptimized className="h-[72px] w-[72px] rounded border border-border bg-white object-contain p-1" /> : null}
          <input id={`${id}-logo`} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={event => { selectLogo(event.target.files?.[0]); event.currentTarget.value = ""; }} className="block max-w-full text-sm" />
          <p className="text-xs text-muted">PNG, JPG, or WebP, up to 1.2 MB.</p>
          {logo || logoProblem.current ? <button type="button" disabled={busy} onClick={() => { if (!logoProblem.current) setLogo(null); logoProblem.current = false; setMessage(null); }} className="diana-button diana-button-ghost min-h-11 px-3 text-sm">{logoProblem.current ? "Clear logo selection" : "Remove logo"}</button> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className="diana-button diana-button-primary min-h-11 px-4 text-sm disabled:opacity-50">{pending || reading ? "Saving…" : "Save school look"}</button>
          {message ? <p role="status" aria-live="polite" className="text-sm">{message}</p> : null}
        </div>
      </form>
    </section>
  );
});
