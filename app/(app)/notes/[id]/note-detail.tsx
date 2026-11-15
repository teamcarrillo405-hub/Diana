"use client";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Plus, Save, Sparkles, Tags, Trash2, X } from "lucide-react";
import { AccessibleReadingText, type ReadingPrefs } from "@/components/accessible-reading-text";
import { TtsHighlightButton } from "@/components/tts-highlight-button";
import { VocabHoverProvider } from "@/components/vocab-hover-provider";
import { ReadingAnnotationControl } from "@/components/reading-annotation-control";
import { ReadingLevelAdapter } from "@/components/reading-level-adapter";
import { StudyArtifactPanel } from "@/components/study-artifact-panel";
import { StudentShell } from "@/components/student-shell/student-shell";
import styles from "@/components/student-shell/notes.module.css";
import type { RelatedNote } from "@/lib/notes/related";
import type { TtsProvider } from "@/lib/supabase/types";
import type { OutlineNode } from "@/lib/notes/types";
import { VisualLearningPanel } from "./visual-learning-panel";
import { saveNote } from "../actions";
import { NoteSynthesisPanel } from "../note-synthesis-panel";
import {
  createFlashcardFromSelection,
  deleteNote,
  suggestNoteTags,
  triggerTranscript,
  updateNoteClass,
  updateNoteTags,
} from "./actions";

export function NoteDetail({
  id,
  title,
  bodyText,
  transcriptText,
  outline,
  actionItems,
  source,
  tags: initialTags,
  aiSuggestedTags: initialAiSuggestedTags,
  relatedNotes,
  readingPrefs,
  ttsOn,
  ttsProvider,
  ttsSpeed,
  ttsPitch,
  ttsVoice,
  classId: initialClassId,
  ownerId,
  aiMode,
  classes,
}: {
  id: string;
  title: string;
  bodyText: string;
  transcriptText: string | null;
  outline: OutlineNode[] | null;
  actionItems: string[];
  source: string;
  tags: string[];
  aiSuggestedTags: string[];
  relatedNotes: RelatedNote[];
  readingPrefs: ReadingPrefs;
  ttsOn: boolean;
  ttsProvider: TtsProvider;
  ttsSpeed: number;
  ttsPitch: number;
  ttsVoice: string;
  classId: string | null;
  ownerId: string;
  aiMode: "red" | "yellow" | "green";
  classes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [transcribing, setTranscribing] = useState(false);
  const [askingDelete, setAskingDelete] = useState(false);
  const [classId, setClassId] = useState<string | null>(initialClassId);
  const [tagsState, setTagsState] = useState(initialTags);
  const [suggestedTags, setSuggestedTags] = useState(initialAiSuggestedTags);
  const [tagInput, setTagInput] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [cardStatus, setCardStatus] = useState<string | null>(null);
  const [tagStatus, setTagStatus] = useState<string | null>(null);
  const [body, setBody] = useState(bodyText);
  const bodyRef = useRef(bodyText);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  function handleSave() {
    setSaveStatus("Saving...");
    startTransition(async () => {
      const result = await saveNote({
        id,
        title,
        bodyText: body,
        classId,
        source: normalizeNoteSource(source),
      });
      setSaveStatus(result.ok ? (bodyRef.current === body ? "Saved" : "Unsaved changes") : result.error);
    });
  }

  function handleClassChange(newId: string | null) {
    setClassId(newId);
    startTransition(async () => {
      const result = await updateNoteClass({ id, classId: newId });
      if (!result.ok) { setClassId(classId); setSaveStatus(result.error); }
    });
  }

  function handleTranscribe() {
    setTranscribing(true);
    startTransition(async () => {
      await triggerTranscript({ id });
      // Fire-and-forget: refresh in 3 s, then again at 8 s if still null.
      setTimeout(() => router.refresh(), 3000);
      setTimeout(() => router.refresh(), 8000);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteNote({ id });
      if (res.ok) router.push("/notes");
      else setDeleteError(res.error);
    });
  }

  function captureSelection() {
    const selection = window.getSelection()?.toString().trim().replace(/\s+/g, " ") ?? "";
    setSelectedText(selection.length >= 3 ? selection.slice(0, 1200) : "");
    if (selection.length >= 3) setCardStatus(null);
  }

  function addTag(tag: string) {
    const next = [...tagsState, tag];
    startTransition(async () => {
      const res = await updateNoteTags({ id, tags: next });
      if (res.ok) {
        setTagsState(res.tags);
        setSuggestedTags((current) => current.filter((t) => !res.tags.includes(t)));
        setTagInput("");
        setTagStatus("Saved.");
      } else {
        setTagStatus(res.error);
      }
    });
  }

  function removeTag(tag: string) {
    startTransition(async () => {
      const res = await updateNoteTags({ id, tags: tagsState.filter((t) => t !== tag) });
      if (res.ok) {
        setTagsState(res.tags);
        setTagStatus("Saved.");
      } else {
        setTagStatus(res.error);
      }
    });
  }

  function requestSuggestedTags() {
    setTagStatus(null);
    startTransition(async () => {
      const res = await suggestNoteTags({ id });
      if (res.ok) {
        setSuggestedTags(res.tags.filter((tag) => !tagsState.includes(tag)));
      } else {
        setTagStatus(res.error);
      }
    });
  }

  function saveSelectionAsCard() {
    if (!selectedText) return;
    setCardStatus("Saving card...");
    startTransition(async () => {
      const res = await createFlashcardFromSelection({ noteId: id, selectedText });
      if (res.ok) {
        setCardStatus("Card saved.");
        setSelectedText("");
      } else {
        setCardStatus(res.error);
      }
    });
  }

  return (
    <StudentShell active="More" className={styles.root} version="12">
      <main id="main-content" className="sd-note-detail-main">
        <div className="sd-note-detail-frame">
          <Link href="/notes" className="sd-note-detail-back"><ArrowLeft size={18} aria-hidden="true" /> Back to notes</Link>
          <div className="sd-note-detail-grid">
        <section className="sd-notes-overview sd-note-detail-editor" aria-labelledby="notes-overview-title">
          <div className="sd-note-detail-kicker">{classes.find((item) => item.id === classId)?.name ?? "Notes"}</div>
          <h1 id="notes-overview-title">{title}</h1>
          <textarea
            aria-label="Note body"
            value={body}
            onChange={(event) => { bodyRef.current = event.target.value; setBody(event.target.value); setSaveStatus("Unsaved changes"); }}
            placeholder="Add the ideas you want to remember..."
          />
          <div className="sd-note-detail-save-row">
            <button type="button" disabled={pending} onClick={handleSave} aria-label="Save note">
              <Save size={14} aria-hidden="true" /> Save note
            </button>
            {saveStatus ? <span role="status" aria-live="polite">{saveStatus}</span> : null}
          </div>
        </section>

        <aside className="sd-note-detail-rail" aria-label="Note help and details">
          {classes.length > 0 && (
            <label>
              <span>Class</span>
              <select disabled={pending} value={classId ?? ""} onChange={(event) => handleClassChange(event.target.value || null)}>
                <option value="">No class</option>
                {classes.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
              </select>
            </label>
          )}
          <NoteSynthesisPanel classId={classId} scopeLabel={`${title} and related class notes`} />
        </aside>

        <details className="notes-detail-workspace sd-note-detail-tools">
          <summary>Study tools <ChevronDown size={18} aria-hidden="true" /></summary>
          <div className="sd-note-detail-tools-inner">
      <StudyArtifactPanel
        sourceType="note"
        sourceId={id}
        aiMode={aiMode}
        studyMode="retrieval_quiz"
      />

      <section className="notes-tags-panel">
        <div className="notes-tags-head">
          <h2>
            <Tags size={13} />
            Tags
          </h2>
          <button
            type="button"
            onClick={requestSuggestedTags}
            className="notes-support-button"
          >
            <Sparkles size={13} />
            Suggest
          </button>
        </div>
        <div className="notes-tag-list">
          {tagsState.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => removeTag(tag)}
              className="notes-tag-chip"
              aria-label={`Remove ${tag}`}
            >
              {tag}
              <X size={11} />
            </button>
          ))}
          {tagsState.length === 0 && <span className="text-xs text-muted">No tags yet.</span>}
        </div>
        {suggestedTags.length > 0 && (
          <div className="notes-tag-list">
            {suggestedTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className="notes-tag-chip notes-tag-chip-suggested"
              >
                <Plus size={11} />
                {tag}
              </button>
            ))}
          </div>
        )}
        <div className="notes-tag-add">
          <input
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTag(tagInput);
              }
            }}
            className="notes-editor-input"
            placeholder="Add tag"
          />
          <button
            type="button"
            onClick={() => addTag(tagInput)}
            className="notes-support-button"
          >
            Add
          </button>
        </div>
        {tagStatus && <p className="text-xs text-muted">{tagStatus}</p>}
      </section>

      {/* Body — what the student wrote/dictated */}
      <section className="notes-reading-section">
        <h2>
          Your notes
        </h2>
        <VocabHoverProvider ownerId={ownerId} aiMode={aiMode} sourceType="note" sourceId={id}>
          <div
            className="reading-view notes-reading-surface whitespace-pre-wrap"
            onMouseUp={captureSelection}
            onKeyUp={captureSelection}
          >
            {ttsOn && body.trim().length > 0 && (
              <div className="mb-3">
                <TtsHighlightButton
                  text={body}
                  provider={ttsProvider}
                  speed={ttsSpeed}
                  pitch={ttsPitch}
                  voice={ttsVoice}
                />
              </div>
            )}
            {body.trim().length > 0 ? (
              <AccessibleReadingText text={body} prefs={readingPrefs} />
            ) : (
              <p className="text-sm text-muted">(empty)</p>
            )}
          </div>
        </VocabHoverProvider>
        <ReadingLevelAdapter text={body} aiMode={aiMode} source={{ sourceType: "note", sourceId: id }} />
        <SelectionCardControl
          selectedText={selectedText}
          cardStatus={cardStatus}
          onSave={saveSelectionAsCard}
        />
        <ReadingAnnotationControl selectedText={selectedText} sourceType="note" sourceId={id} />
      </section>

      {/* Transcript — AI-cleaned version, if generated */}
      {source === "lecture" && actionItems.length > 0 && (
        <section className="notes-transcript-action">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            Action items sent to Work
          </h2>
          <ul className="space-y-2 rounded-2xl border border-border bg-surface-raised p-4 text-sm">
            {actionItems.map((item) => (
              <li key={item} className="text-muted">{item}</li>
            ))}
          </ul>
        </section>
      )}

      {transcriptText ? (
        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            Cleaned transcript
          </h2>
          <VocabHoverProvider ownerId={ownerId} aiMode={aiMode} sourceType="note" sourceId={id}>
            <div className="reading-view rounded-2xl border border-subject-reading/25 p-4">
              {ttsOn && (
                <TtsHighlightButton
                  text={transcriptText}
                  provider={ttsProvider}
                  speed={ttsSpeed}
                  pitch={ttsPitch}
                  voice={ttsVoice}
                />
              )}
              <div
                className="mt-3 whitespace-pre-wrap"
                onMouseUp={captureSelection}
                onKeyUp={captureSelection}
              >
                <AccessibleReadingText text={transcriptText} prefs={readingPrefs} />
              </div>
            </div>
          </VocabHoverProvider>
          <ReadingLevelAdapter text={transcriptText} aiMode={aiMode} source={{ sourceType: "note", sourceId: id }} />
          <SelectionCardControl
            selectedText={selectedText}
            cardStatus={cardStatus}
            onSave={saveSelectionAsCard}
          />
          <ReadingAnnotationControl selectedText={selectedText} sourceType="note" sourceId={id} />
        </section>
      ) : (
        <section className="space-y-2">
          <button
            type="button"
            onClick={handleTranscribe}
            disabled={transcribing || !body.trim()}
            className="notes-support-button"
          >
            <Sparkles size={14} />
            {transcribing ? "Thinking..." : "Generate transcript + outline"}
          </button>
        </section>
      )}

      {/* Outline — AI structure, if generated */}
      {outline && outline.length > 0 && (
        <section className="notes-related-panel">
          <h2>
            Outline
          </h2>
          <div className="space-y-3 rounded-2xl border border-border bg-surface-raised p-4">
            {outline.map((node, i) => (
              <div key={i}>
                <p className="text-sm font-medium">{node.heading}</p>
                <ul className="ml-4 list-disc space-y-1 text-sm text-muted">
                  {node.bullets.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <VisualLearningPanel
        noteId={id}
        title="Visual learning"
        text={[body, transcriptText ?? ""].join("\n")}
        outline={outline}
      />

      {relatedNotes.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            Related notes
          </h2>
          <ul>
            {relatedNotes.map((note) => (
              <li key={note.id}>
                <Link href={`/notes/${note.id}`} className="text-sm font-medium text-accent underline-offset-2 hover:underline">
                  {note.title}
                </Link>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{note.snippet}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Delete — single confirmation, calm copy */}
      <section className="notes-delete-panel">
        {deleteError ? <p role="alert">{deleteError}</p> : null}
        {!askingDelete ? (
          <button
            type="button"
            onClick={() => setAskingDelete(true)}
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg"
          >
            <Trash2 size={13} />
            Delete this note
          </button>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">Delete this note?</span>
            <button
              type="button"
              disabled={pending}
              onClick={handleDelete}
              className="touch-target rounded-xl bg-danger px-3 py-1 text-sm font-medium text-white"
            >
              Yes, delete
            </button>
            <button
              type="button"
              onClick={() => setAskingDelete(false)}
              className="touch-target rounded-xl border border-border bg-surface-raised px-3 py-1 text-sm hover:bg-surface-soft"
            >
              Keep
            </button>
          </div>
        )}
      </section>
          </div>
        </details>
          </div>
        </div>
      </main>
    </StudentShell>
  );
}

function SelectionCardControl({
  selectedText,
  cardStatus,
  onSave,
}: {
  selectedText: string;
  cardStatus: string | null;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onSave}
        disabled={!selectedText}
        className="touch-target inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-raised px-3 py-1.5 text-xs text-muted hover:bg-surface-soft disabled:opacity-50"
      >
        <Plus size={13} />
        Add highlight to recall
      </button>
      {selectedText && (
        <span className="max-w-full truncate text-xs text-muted">
          {selectedText.slice(0, 90)}
        </span>
      )}
      {cardStatus && <span className="text-xs text-muted">{cardStatus}</span>}
    </div>
  );
}

function normalizeNoteSource(
  source: string,
): "manual" | "voice" | "audio_upload" | "doc_upload" | "lecture" {
  if (
    source === "voice"
    || source === "audio_upload"
    || source === "doc_upload"
    || source === "lecture"
  ) {
    return source;
  }
  return "manual";
}
