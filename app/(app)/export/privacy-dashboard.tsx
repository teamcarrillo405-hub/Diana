"use client";

import {
  ArchiveRestore,
  Download,
  FileArchive,
  FileJson,
  FileText,
  LockKeyhole,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
  activeShareCount,
  deletionStatus,
}: {
  inventory: readonly DataInventoryRow[];
  classes: readonly ClassRow[];
  notificationPrefs: NotificationPreferences;
  timezone: string;
  handoff: HandoffRow;
  activeShareCount: number;
  deletionStatus: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [prefs, setPrefs] = useState(notificationPrefs);
  const [deleteCategory, setDeleteCategory] = useState<PrivacyDeleteCategory | "">("");
  const [categoryConfirmed, setCategoryConfirmed] = useState(false);
  const [deletionConfirmed, setDeletionConfirmed] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const deletionActive = deletionStatus === "requested" || deletionStatus === "processing";

  function downloadJson() {
    setMessage(null);
    startTransition(async () => {
      const result = await exportUserDataJson();
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      downloadText("diana-data-export.json", result.data, "application/json");
      setMessage("JSON export ready.");
    });
  }

  function downloadPdf() {
    setMessage(null);
    startTransition(async () => {
      const result = await exportUserDataPdf();
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      downloadBytes("diana-data-export.pdf", result.data, "application/pdf");
      setMessage("PDF export ready.");
    });
  }

  function savePrefs(next: NotificationPreferences) {
    const previous = prefs;
    setPrefs(next);
    startTransition(async () => {
      const result = await saveNotificationPreferences(next);
      if (!result.ok) setPrefs(previous);
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
      if (!backup.ok) {
        setMessage(backup.error);
        return;
      }
      const encrypted = await encryptText(backup.data, passphrase);
      downloadText(
        "diana-profile-backup.json",
        JSON.stringify(encrypted, null, 2),
        "application/json",
      );
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
        setMessage("That backup could not be opened. Check the file and passphrase.");
      }
    });
  }

  function requestDeletion() {
    startTransition(async () => {
      const result = await requestAccountDeletion();
      if (result.ok) {
        setMessage("Deletion request saved. AI features are off now.");
        setDeletionConfirmed(false);
        router.refresh();
        return;
      }
      setMessage(result.error);
    });
  }

  function clearCategory() {
    if (!deleteCategory || !categoryConfirmed) {
      setMessage("Choose a category and confirm the request.");
      return;
    }
    startTransition(async () => {
      const result = await deleteDataCategory({ category: deleteCategory });
      if (result.ok) {
        setDeleteCategory("");
        setCategoryConfirmed(false);
        router.refresh();
        setMessage(`${result.label} cleared.`);
        return;
      }
      setMessage(result.error);
    });
  }

  const notificationKeys = Object.keys(prefs) as Array<keyof NotificationPreferences>;

  return (
    <div>
      {message ? (
        <p className="sd-privacy-message" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}

      <section aria-labelledby="privacy-export-title">
        <p id="privacy-export-title" className="sd-privacy-section-label">
          Master file export
        </p>
        <div className="sd-privacy-export-grid">
          <article className="sd-privacy-export-card">
            <span className="sd-privacy-export-icon">
              <FileJson size={20} aria-hidden="true" />
            </span>
            <span className="sd-privacy-export-copy">
              <h2>JSON file</h2>
              <p>Portable copy of your Diana records.</p>
            </span>
            <button
              type="button"
              onClick={downloadJson}
              disabled={pending}
              aria-label="Export my data"
            >
              <Download size={14} aria-hidden="true" /> Download
            </button>
          </article>
          <article className="sd-privacy-export-card">
            <span className="sd-privacy-export-icon">
              <FileText size={20} aria-hidden="true" />
            </span>
            <span className="sd-privacy-export-copy">
              <h2>PDF summary</h2>
              <p>Readable count summary for your records.</p>
            </span>
            <button type="button" onClick={downloadPdf} disabled={pending}>
              <Download size={14} aria-hidden="true" /> Download PDF
            </button>
          </article>
        </div>
      </section>

      <section className="sd-privacy-panel" aria-labelledby="privacy-status-title">
        <p id="privacy-status-title" className="sd-privacy-panel-title">
          <ShieldCheck size={15} aria-hidden="true" /> Privacy status
        </p>
        <div className="sd-privacy-status">
          <span>
            <strong>COPPA protection</strong>
            Student data remains owner-scoped.
          </span>
          <span className="sd-privacy-pill">Active</span>
        </div>
        <div className="sd-privacy-status">
          <span>
            <strong>Scout visibility</strong>
            {activeShareCount} active private link{activeShareCount === 1 ? "" : "s"}.
          </span>
          <Link href="/sharing" className="sd-privacy-pill">
            Manage
          </Link>
        </div>
      </section>

      <details className="sd-privacy-advanced">
        <summary>Advanced controls and inventory</summary>
        <div className="sd-privacy-controls">
          <section className="sd-privacy-control">
            <h2>Data inventory</h2>
            <div className="sd-privacy-inventory">
              {inventory.map((row) => (
                <div key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.count}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="sd-privacy-control">
            <h2>AI style by class</h2>
            {classes.length === 0 ? <p>No classes to configure.</p> : null}
            {classes.map((klass) => (
              <label key={klass.id}>
                <span>{klass.name}</span>
                <select
                  defaultValue={klass.verbosity}
                  onChange={(event) =>
                    saveVerbosity(klass.id, event.target.value as AiVerbosity)
                  }
                >
                  <option value="minimal">Minimal</option>
                  <option value="balanced">Balanced</option>
                  <option value="detailed">Detailed</option>
                </select>
              </label>
            ))}
          </section>

          <section className="sd-privacy-control">
            <h2>Notification preferences</h2>
            {notificationKeys.map((key) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={prefs[key]}
                  onChange={(event) => savePrefs({ ...prefs, [key]: event.target.checked })}
                />
                {labelize(key)}
              </label>
            ))}
          </section>

          <section className="sd-privacy-control">
            <h2>Encrypted profile backup</h2>
            <label>
              <span className="sr-only">Backup passphrase</span>
              <input
                type="password"
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
                placeholder="Backup passphrase"
              />
            </label>
            <button type="button" onClick={downloadBackup} disabled={pending}>
              <FileArchive size={15} aria-hidden="true" /> Export backup
            </button>
            <label className="sd-privacy-file">
              <ArchiveRestore size={15} aria-hidden="true" /> Import backup
              <input
                type="file"
                accept="application/json"
                className="sr-only"
                onChange={(event) => importBackup(event.target.files?.[0] ?? null)}
              />
            </label>
          </section>

          <section className="sd-privacy-control">
            <h2>Device handoff</h2>
            <p>
              <LockKeyhole size={14} aria-hidden="true" />{" "}
              {handoff
                ? `Last route: ${handoff.route} at ${formatHandoffTimestamp(handoff.updated_at, timezone)}`
                : "No handoff saved yet."}
            </p>
          </section>

          <section className="sd-privacy-control sd-privacy-delete">
            <h2>Clear a data category</h2>
            <select
              aria-label="Data category"
              value={deleteCategory}
              onChange={(event) => {
                setDeleteCategory(event.target.value as PrivacyDeleteCategory | "");
                setCategoryConfirmed(false);
              }}
            >
              <option value="">Choose category</option>
              {PRIVACY_DELETE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {categoryLabel(category)}
                </option>
              ))}
            </select>
            <label>
              <input
                type="checkbox"
                checked={categoryConfirmed}
                onChange={(event) => setCategoryConfirmed(event.target.checked)}
              />
              I understand this permanently clears the selected category
            </label>
            <button
              type="button"
              onClick={clearCategory}
              disabled={pending || !deleteCategory || !categoryConfirmed}
            >
              <Trash2 size={15} aria-hidden="true" /> Clear selected data
            </button>
          </section>

          <section className="sd-privacy-control sd-privacy-delete">
            <h2>Account deletion request</h2>
            <p>
              This turns off AI immediately and starts the COPPA deletion workflow.
            </p>
            {deletionStatus ? <p>Current request status: {deletionStatus}.</p> : null}
            <label>
              <input
                type="checkbox"
                checked={deletionConfirmed}
                disabled={deletionActive}
                onChange={(event) => setDeletionConfirmed(event.target.checked)}
              />
              I understand this turns off AI now and starts the deletion request
            </label>
            <button
              type="button"
              onClick={requestDeletion}
              disabled={pending || deletionActive || !deletionConfirmed}
              aria-label="Request account deletion"
            >
              <Trash2 size={15} aria-hidden="true" />
              {deletionActive ? "Request in progress" : "Request account deletion"}
            </button>
          </section>
        </div>
      </details>
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
