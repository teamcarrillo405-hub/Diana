"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Brain, ChevronDown, Plus, Save, Sparkles, Tags, Trash2, X } from "lucide-react";
import { AccessibleReadingText, type ReadingPrefs } from "@/components/accessible-reading-text";
import { TtsHighlightButton } from "@/components/tts-highlight-button";
import { VocabHoverProvider } from "@/components/vocab-hover-provider";
import { ReadingAnnotationControl } from "@/components/reading-annotation-control";
import { ReadingLevelAdapter } from "@/components/reading-level-adapter";
import { StudyArtifactPanel } from "@/components/study-artifact-panel";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
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

const NOTE_DETAIL_STYLES = `
  .sd-note-detail { min-height:100dvh; background:linear-gradient(rgb(214 218 214 / .84),rgb(214 218 214 / .9)),url("/images/classes-high-tech-classroom.png") center/cover fixed; color:#182126; font-family:var(--font-lexend),Lexend,system-ui,sans-serif; }
  .sd-note-detail-main { width:calc(100% - (2 * clamp(24px,3.5vw,72px))); max-width:1680px; margin:0 auto; padding:clamp(34px,4vw,64px) 0 clamp(52px,6vw,96px); }
  .sd-note-detail-frame { width:min(100%,1240px); margin:0 auto; }
  .sd-note-detail-back { display:inline-flex; align-items:center; gap:8px; min-height:44px; color:#182126; font-size:14px; font-weight:600; text-decoration:none; }
  .sd-note-detail-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(300px,350px); gap:24px; align-items:start; }
  .sd-note-detail-editor,.sd-note-detail-rail,.sd-note-detail-tools { border:1px solid rgb(255 255 255 / .76); background:linear-gradient(135deg,rgb(248 250 247 / .7),rgb(238 244 238 / .46)); box-shadow:inset 0 1px 0 rgb(255 255 255 / .72),0 14px 34px rgb(24 33 38 / .12); backdrop-filter:blur(24px) saturate(1.04); }
  .sd-note-detail-editor { border-radius:12px 20px 12px 20px; padding:clamp(22px,2.8vw,34px); }
  .sd-note-detail-kicker { margin:0 0 7px; color:#53615c; font-size:14px; font-weight:600; }
  .sd-note-detail-editor h1 { margin:0; color:#182126; font-size:clamp(30px,3vw,42px); font-weight:620; line-height:1.14; letter-spacing:0; }
  .sd-note-detail-editor textarea { box-sizing:border-box; width:100%; min-height:390px; margin-top:24px; resize:vertical; border:1px solid rgb(24 33 38 / .22); border-radius:10px; outline:0; background:rgb(255 255 255 / .68); padding:18px; color:#182126; font:400 16px/1.65 var(--font-lexend),Lexend,sans-serif; }
  .sd-note-detail-editor textarea:focus-visible,.sd-note-detail-rail select:focus-visible { outline:3px solid rgb(24 33 38 / .28); outline-offset:2px; }
  .sd-note-detail-save-row { display:flex; align-items:center; gap:12px; margin-top:14px; }
  .sd-note-detail-save-row button { min-height:44px; border:1px solid #c6d23f; border-radius:8px; background:#e8f56b; padding:0 18px; color:#141d20; font:600 14px var(--font-lexend),Lexend,sans-serif; cursor:pointer; }
  .sd-note-detail-save-row span { color:#53615c; font-size:14px; }
  .sd-note-detail-rail { display:grid; gap:18px; border-radius:12px; padding:22px; }
  .sd-note-detail-rail label { display:grid; gap:8px; color:#53615c; font-size:14px; font-weight:600; }
  .sd-note-detail-rail select { min-height:44px; border:1px solid rgb(24 33 38 / .22); border-radius:8px; background:rgb(255 255 255 / .7); padding:0 12px; color:#182126; font:400 16px var(--font-lexend),Lexend,sans-serif; }
  .sd-note-detail-rail .sd-notes-chat { display:grid; gap:12px; }
  .sd-note-detail-rail .sd-notes-chat-head { display:grid; gap:4px; }
  .sd-note-detail-rail .sd-notes-chat-head h2 { display:flex; align-items:center; gap:8px; margin:0; font-size:20px; font-weight:620; }
  .sd-note-detail-rail .sd-notes-chat-head p,.sd-note-detail-rail .sd-notes-chat-history > p { margin:0; color:#53615c; font-size:14px; line-height:1.55; }
  .sd-note-detail-rail .sd-notes-chat-history { display:grid; gap:10px; min-height:72px; }
  .sd-note-detail-rail .sd-notes-chat-turn { border:1px solid rgb(24 33 38 / .16); border-radius:10px; padding:12px; color:#182126; font-size:15px; line-height:1.6; white-space:pre-wrap; }
  .sd-note-detail-rail .sd-notes-chat-turn--student { background:#182126; color:#fff; }
  .sd-note-detail-rail .sd-notes-chat-turn--diana { background:rgb(255 255 255 / .52); }
  .sd-note-detail-rail .sd-notes-chat-composer { display:grid; gap:8px; border:1px solid rgb(24 33 38 / .2); border-radius:10px; background:rgb(255 255 255 / .5); padding:10px; }
  .sd-note-detail-rail .sd-notes-chat-composer textarea { width:100%; min-height:78px; resize:vertical; border:0; outline:0; background:transparent; color:#182126; font:400 15px/1.55 var(--font-lexend),Lexend,sans-serif; }
  .sd-note-detail-rail .sd-notes-chat-actions { display:flex; justify-content:flex-end; }
  .sd-note-detail-rail .sd-notes-chat-actions button { display:grid; width:44px; height:44px; place-items:center; border:1px solid #c6d23f; border-radius:8px; background:#e8f56b; color:#141d20; cursor:pointer; }
  .sd-note-detail-tools { display:none!important; }
  .sd-note-detail-tools > summary { display:flex; min-height:54px; align-items:center; justify-content:space-between; padding:0 22px; color:#182126; font-size:16px; font-weight:600; cursor:pointer; list-style:none; }
  .sd-note-detail-tools > summary::-webkit-details-marker { display:none; }
  .sd-note-detail-tools[open] > summary { border-bottom:1px solid rgb(24 33 38 / .14); }
  .sd-note-detail-tools[open] > summary svg { transform:rotate(180deg); }
  .sd-note-detail-tools-inner { display:grid; gap:18px; padding:22px; }
  .sd-note-detail-tools-inner > .notes-detail-class-picker { display:none!important; }
  .sd-note-detail .notes-remember-panel,.sd-note-detail .notes-tags-panel,.sd-note-detail .notes-related-panel,.sd-note-detail .notes-reading-section,.sd-note-detail .notes-transcript-action,.sd-note-detail .notes-delete-panel,.sd-note-detail .space-y-2 { display:grid; gap:12px; border:1px solid rgb(24 33 38 / .16); border-radius:10px; background:rgb(255 255 255 / .42); padding:18px; clip-path:none; }
  .sd-note-detail .notes-remember-panel > p,.sd-note-detail .notes-tags-head h2,.sd-note-detail .notes-reading-section > h2,.sd-note-detail .notes-related-panel > h2 { margin:0; color:#53615c; font:600 14px var(--font-lexend),Lexend,sans-serif; letter-spacing:0; text-transform:none; }
  .sd-note-detail .notes-remember-panel h2 { margin:0; color:#182126; font-size:22px; font-weight:620; }
  .sd-note-detail .notes-remember-panel > div { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
  .sd-note-detail .notes-remember-panel > div > div { border:1px solid rgb(24 33 38 / .12); background:rgb(255 255 255 / .34); padding:12px; }
  .sd-note-detail .notes-support-button { min-height:40px; border:1px solid rgb(24 33 38 / .22); border-radius:8px; background:rgb(255 255 255 / .6); color:#182126; clip-path:none; font:600 14px var(--font-lexend),Lexend,sans-serif; }
  .sd-note-detail .notes-tag-chip { border-radius:8px; color:#182126; font-family:var(--font-lexend),Lexend,sans-serif; letter-spacing:0; text-transform:none; }
  .sd-note-detail .sd-student-bottom-nav { display:none; }
  @media (max-width:900px) { .sd-note-detail-main { width:calc(100% - 32px); padding:28px 0 108px; } .sd-note-detail-grid { grid-template-columns:1fr; } .sd-note-detail-rail,.sd-note-detail-tools { grid-column:auto; } .sd-note-detail-editor textarea { min-height:300px; } .sd-note-detail .sd-student-bottom-nav { display:flex; } }
`;

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
  const [, startTransition] = useTransition();
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
      setSaveStatus(result.ok ? "Saved" : result.error);
    });
  }

  function handleClassChange(newId: string | null) {
    setClassId(newId);
    startTransition(async () => {
      await updateNoteClass({ id, classId: newId });
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
    <div className="sd-note-detail diana-current-page" aria-label="Notes surface">
      <style>{NOTE_DETAIL_STYLES}</style>
      <StudentDesktopNav active="More" />
      <main className="sd-note-detail-main">
        <div className="sd-note-detail-frame">
          <Link href="/notes" className="sd-note-detail-back"><ArrowLeft size={18} aria-hidden="true" /> Back to notes</Link>
          <div className="sd-note-detail-grid">
        <section className="sd-notes-overview sd-note-detail-editor" aria-labelledby="notes-overview-title">
          <div className="sd-note-detail-kicker">{classes.find((item) => item.id === classId)?.name ?? "Notes"}</div>
          <h1 id="notes-overview-title">{title}</h1>
          <textarea
            aria-label="Note body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Add the ideas you want to remember..."
          />
          <div className="sd-note-detail-save-row">
            <button type="button" onClick={handleSave} aria-label="Save note">
              <Save size={14} aria-hidden="true" /> Save note
            </button>
            {saveStatus ? <span role="status" aria-live="polite">{saveStatus}</span> : null}
          </div>
        </section>

        <aside className="sd-note-detail-rail" aria-label="Note help and details">
          {classes.length > 0 && (
            <label>
              <span>Class</span>
              <select value={classId ?? ""} onChange={(event) => handleClassChange(event.target.value || null)}>
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
      {/* Retained for the existing class-save behavior; the active picker is in the right rail. */}
      {classes.length > 0 && (
        <label className="notes-detail-class-picker">
          <span>Class</span>
          <select
            value={classId ?? ""}
            onChange={(e) => handleClassChange(e.target.value || null)}
            className="notes-editor-input"
          >
            <option value="">No class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      )}

      <section className="notes-remember-panel">
        <p>
          Remember bar
        </p>
        <h2>Turn notes into practice</h2>
        <div>
          <div>
            <Brain size={15} />
            <p className="text-sm text-muted">Use a selected line for recall, not rereading.</p>
          </div>
          <div>
            <BookOpen size={15} />
            <p className="text-sm text-muted">Highlight one term or fact, then save it as a card.</p>
          </div>
        </div>
      </section>

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
        <ReadingLevelAdapter text={body} aiMode={aiMode} />
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
          <ReadingLevelAdapter text={transcriptText} aiMode={aiMode} />
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
      <StudentBottomNav />
    </div>
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
        Create card from highlight
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
