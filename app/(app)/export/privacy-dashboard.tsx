"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileArchive, FileJson, ShieldCheck, Trash2 } from "lucide-react";
import {
  categoryLabel,
  formatHandoffTimestamp,
  PRIVACY_DELETE_CATEGORIES,
  type AiVerbosity,
  type DataInventoryRow,
  type NotificationPreferences,
  type PrivacyDeleteCategory,
} from "@/lib/privacy/export";
import {
  deleteDataCategory,
  exportProfileBackup,
  exportUserDataJson,
  exportUserDataPdf,
  importProfileBackup,
  requestAccountDeletion,
  saveNotificationPreferences,
  saveSubjectVerbosity,
} from "./actions";

type ClassRow = { id: string; name: string; verbosity: AiVerbosity };
type HandoffRow = { route: string; updated_at: string } | null;

export function PrivacyDashboard({
  inventory,
  classes,
  notificationPrefs,
  timezone,
  handoff,
}: {
  inventory: DataInventoryRow[];
  classes: ClassRow[];
  notificationPrefs: NotificationPreferences;
  timezone: string;
  handoff: HandoffRow;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [prefs, setPrefs] = useState(notificationPrefs);
  const [deleteCategory, setDeleteCategory] = useState<PrivacyDeleteCategory | "">("");
  const [passphrase, setPassphrase] = useState("");

  function downloadJson() {
    startTransition(async () => {
      downloadText("diana-data-export.json", await exportUserDataJson(), "application/json");
      setMessage("JSON export ready.");
    });
  }

  function downloadPdf() {
    startTransition(async () => {
      const base64 = await exportUserDataPdf();
      downloadBytes("diana-data-export.pdf", base64, "application/pdf");
      setMessage("PDF export ready.");
    });
  }

  function savePrefs(next: NotificationPreferences) {
    setPrefs(next);
    startTransition(async () => {
      const result = await saveNotificationPreferences(next);
      setMessage(result.ok ? "Notification preferences saved." : result.error);
    });
  }

  function saveVerbosity(classId: string, verbosity: AiVerbosity) {
    startTransition(async () => {
      const result = await saveSubjectVerbosity({ classId, verbosity });
      setMessage(result.ok ? "AI style saved." : result.error);
    });
  }

  function downloadBackup() {
    startTransition(async () => {
      if (!passphrase) {
        setMessage("Add a passphrase first.");
        return;
      }
      const backup = await exportProfileBackup();
      const encrypted = await encryptText(backup, passphrase);
      downloadText("diana-profile-backup.json", JSON.stringify(encrypted, null, 2), "application/json");
      setMessage("Encrypted backup ready.");
    });
  }

  function importBackup(file: File | null) {
    if (!file || !passphrase) {
      setMessage("Choose a backup file and passphrase.");
      return;
    }
    startTransition(async () => {
      try {
        const encrypted = JSON.parse(await file.text()) as EncryptedPayload;
        const plain = await decryptText(encrypted, passphrase);
        const parsed = JSON.parse(plain) as { profile?: unknown };
        const result = await importProfileBackup({ profile: parsed.profile });
        setMessage(result.ok ? "Profile backup imported." : result.error);
      } catch {
        setMessage("Could not read that backup — check the file and passphrase.");
      }
    });
  }

  function requestDeletion() {
    startTransition(async () => {
      const result = await requestAccountDeletion();
      setMessage(result.ok ? "Deletion request saved. AI features are off now." : result.error);
    });
  }

  function clearCategory() {
    if (!deleteCategory) {
      setMessage("Choose a data category.");
      return;
    }
    startTransition(async () => {
      const result = await deleteDataCategory({ category: deleteCategory });
      if (result.ok) {
        setDeleteCategory("");
        router.refresh();
        setMessage(`${result.label} cleared.`);
        return;
      }
      setMessage(result.error);
    });
  }

  const notificationKeys = Object.keys(prefs) as Array<keyof NotificationPreferences>;

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {message}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {inventory.map((row) => (
          <div key={row.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted">{row.label}</p>
            <p className="mt-2 text-2xl font-semibold">{row.count}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">AI context</h2>
        <div className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
          <p>Current assignment or note text for the active tool.</p>
          <p>Class AI policy, rubric context, and selected AI style.</p>
          <p>Profile accessibility settings and accommodation context.</p>
          <p>AI interaction logs used for budget and authorship history.</p>
          <p>Saved study artifacts created from notes or assignments.</p>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Data export</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={downloadJson} disabled={pending} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
            <FileJson size={16} />
            Download JSON
          </button>
          <button onClick={downloadPdf} disabled={pending} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
            <Download size={16} />
            Download PDF
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">AI style by class</h2>
        <div className="mt-3 space-y-2">
          {classes.map((klass) => (
            <label key={klass.id} className="flex items-center justify-between gap-3 text-sm">
              <span>{klass.name}</span>
              <select
                defaultValue={klass.verbosity}
                onChange={(event) => saveVerbosity(klass.id, event.target.value as AiVerbosity)}
                className="rounded-md border border-border bg-bg px-2 py-1"
              >
                <option value="minimal">Minimal</option>
                <option value="balanced">Balanced</option>
                <option value="detailed">Detailed</option>
              </select>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Notification preferences</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {notificationKeys.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={(event) => savePrefs({ ...prefs, [key]: event.target.checked })}
              />
              {labelize(key)}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Profile backup</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            type="password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            placeholder="Backup passphrase"
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm"
          />
          <button onClick={downloadBackup} disabled={pending} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
            <FileArchive size={16} />
            Export backup
          </button>
        </div>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
          <input type="file" accept="application/json" className="sr-only" onChange={(event) => importBackup(event.target.files?.[0] ?? null)} />
          Import backup
        </label>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Clear data by category</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select
            value={deleteCategory}
            onChange={(event) => setDeleteCategory(event.target.value as PrivacyDeleteCategory | "")}
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm"
          >
            <option value="">Choose category</option>
            {PRIVACY_DELETE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)}
              </option>
            ))}
          </select>
          <button
            onClick={clearCategory}
            disabled={pending || !deleteCategory}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
          >
            <Trash2 size={16} />
            Clear selected data
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Device handoff</h2>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted">
          <ShieldCheck size={16} className="text-accent" />
          {handoff ? `Last route: ${handoff.route} at ${formatHandoffTimestamp(handoff.updated_at, timezone)}` : "No handoff saved yet."}
        </div>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        <h2 className="text-sm font-semibold">Account deletion request</h2>
        <p className="mt-1 text-sm">
          This saves a deletion request and turns off AI features immediately.
        </p>
        <button onClick={requestDeletion} disabled={pending} className="mt-3 inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white">
          <Trash2 size={16} />
          Request deletion
        </button>
      </section>
    </div>
  );
}

function labelize(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function downloadText(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  clickDownload(filename, url);
}

function downloadBytes(filename: string, base64: string, type: string) {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  clickDownload(filename, url);
}

function clickDownload(filename: string, url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

type EncryptedPayload = {
  salt: string;
  iv: string;
  data: string;
};

async function encryptText(text: string, passphrase: string): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asArrayBuffer(iv) },
    key,
    asArrayBuffer(new TextEncoder().encode(text)),
  );
  return { salt: toBase64(salt), iv: toBase64(iv), data: toBase64(new Uint8Array(data)) };
}

async function decryptText(payload: EncryptedPayload, passphrase: string): Promise<string> {
  const salt = fromBase64(payload.salt);
  const iv = fromBase64(payload.iv);
  const key = await deriveKey(passphrase, salt);
  const data = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asArrayBuffer(iv) },
    key,
    asArrayBuffer(fromBase64(payload.data)),
  );
  return new TextDecoder().decode(data);
}

async function deriveKey(passphrase: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey(
    "raw",
    asArrayBuffer(new TextEncoder().encode(passphrase)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: asArrayBuffer(salt), iterations: 120_000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
