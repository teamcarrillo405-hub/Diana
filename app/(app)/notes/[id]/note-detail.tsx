"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Brain, Plus, Sparkles, Tags, Trash2, X } from "lucide-react";
import { AccessibleReadingText, type ReadingPrefs } from "@/components/accessible-reading-text";
import { TtsHighlightButton } from "@/components/tts-highlight-button";
import { VocabHoverProvider } from "@/components/vocab-hover-provider";
import { ReadingAnnotationControl } from "@/components/reading-annotation-control";
import { ReadingLevelAdapter } from "@/components/reading-level-adapter";
import { StudyArtifactPanel } from "@/components/study-artifact-panel";
import type { RelatedNote } from "@/lib/notes/related";
import type { TtsProvider } from "@/lib/supabase/types";
import type { OutlineNode } from "@/lib/notes/types";
import { VisualLearningPanel } from "./visual-learning-panel";
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
  classAiMode,
  classes,
}: {
  id: string;
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
  classAiMode: "red" | "yellow" | "green";
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
    <div className="notes-detail-workspace">
      {/* Class picker — always visible if student has classes */}
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
        aiMode={classAiMode}
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
        <VocabHoverProvider ownerId={ownerId} aiMode={classAiMode} sourceType="note" sourceId={id}>
          <div
            className="reading-view notes-reading-surface whitespace-pre-wrap"
            onMouseUp={captureSelection}
            onKeyUp={captureSelection}
          >
            {ttsOn && bodyText.trim().length > 0 && (
              <div className="mb-3">
                <TtsHighlightButton
                  text={bodyText}
                  provider={ttsProvider}
                  speed={ttsSpeed}
                  pitch={ttsPitch}
                  voice={ttsVoice}
                />
              </div>
            )}
            {bodyText.trim().length > 0 ? (
              <AccessibleReadingText text={bodyText} prefs={readingPrefs} />
            ) : (
              <p className="text-sm text-muted">(empty)</p>
            )}
          </div>
        </VocabHoverProvider>
        <ReadingLevelAdapter text={bodyText} aiMode={classAiMode} />
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
            Action items sent to inbox
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
          <VocabHoverProvider ownerId={ownerId} aiMode={classAiMode} sourceType="note" sourceId={id}>
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
          <ReadingLevelAdapter text={transcriptText} aiMode={classAiMode} />
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
            disabled={transcribing || !bodyText.trim()}
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
        text={[bodyText, transcriptText ?? ""].join("\n")}
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
