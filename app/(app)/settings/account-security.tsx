"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { changeAccountPassword } from "@/app/(auth)/password-actions";
import { passwordValidation } from "@/lib/auth/entry";
import styles from "./account-security.module.css";
export function AccountSecurity({
  email
}: {
  email?: string | null;
}) {
  const [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState<string | null>(null),
    [saved, setSaved] = useState(false);
  const submitting = useRef(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    setSaved(false);
    const validation = passwordValidation(password, confirmation);
    if (validation) {
      setMessage(validation);
      return;
    }
    submitting.current = true;
    setPending(true);
    setMessage(null);
    try {
      const result = await changeAccountPassword(current, password, confirmation);
      setMessage(result.message);
      setSaved(result.ok);
      if (result.ok) {
        setCurrent("");
        setPassword("");
        setConfirmation("");
        setVisible(false);
      }
    } catch {
      setMessage("The connection paused. Your password change could not be confirmed. Try again.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  return <section className={styles.root} aria-labelledby="security-title"><header><p className={styles.eyebrow}>Account security</p><h2 id="security-title">Change password</h2><p>{email ? "For " + email + ". " : ""}Confirm your current password to choose a new one.</p></header><form method="post" onSubmit={submit} aria-busy={pending}>
    {[{
        id: "account-current-password",
        label: "Current password",
        value: current,
        set: setCurrent,
        complete: "current-password"
      }, {
        id: "account-new-password",
        label: "New password",
        value: password,
        set: setPassword,
        complete: "new-password"
      }, {
        id: "account-confirm-password",
        label: "Confirm new password",
        value: confirmation,
        set: setConfirmation,
        complete: "new-password"
      }].map((field, index) => <div className={styles.field} key={field.id}><label htmlFor={field.id}>{field.label}</label><input id={field.id} type={visible ? "text" : "password"} autoComplete={field.complete} required minLength={index ? 12 : undefined} maxLength={index ? 128 : 256} value={field.value} onChange={e => field.set(e.target.value)} /></div>)}
    <p className={styles.hint}>Use 12 or more characters. A phrase works well.</p><button className={styles.visibility} type="button" aria-pressed={visible} onClick={() => setVisible(v => !v)}>{visible ? "Hide passwords" : "Show passwords"}</button>{message ? <p className={styles.message} data-saved={saved || undefined} role={saved ? "status" : "alert"}>{message}</p> : null}<button className={styles.submit} type="submit" disabled={pending}>{pending ? "Saving…" : "Save password"}</button>
    </form><Link className={styles.recovery} href="/forgot-password?next=%2Fsettings%3Fsection%3Dsecurity">Need a reset link?</Link></section>;
}
