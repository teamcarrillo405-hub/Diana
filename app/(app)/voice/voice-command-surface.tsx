"use client";

import { useState } from "react";
import { FileAudio, X } from "lucide-react";

import { VoiceTextarea } from "@/components/voice-textarea";
import { saveInboxItem } from "../quick-add/actions";

type ClassOption = { id: string; name: string };

export function VoiceCommandSurface({ classes }: { classes: ClassOption[] }) {
  const [transcript, setTranscript] = useState("");
  const [classId, setClassId] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  function updateTranscript(value: string) {
    setTranscript(value);
    if (saveState !== "idle") {
      setSaveState("idle");
      setMessage("");
    }
  }

  function addTranscript(chunk: string) {
    setTranscript((current) => [current.trim(), chunk.trim()].filter(Boolean).join(" "));
    if (saveState !== "idle") {
      setSaveState("idle");
      setMessage("");
    }
  }

  async function saveVoiceNote() {
    const raw = transcript.trim();
    if (!raw || saveState === "saving") return;

    setSaveState("saving");
    setMessage("");
    const result = await saveInboxItem({
      raw,
      captureMode: "voice",
      ...(classId ? { classId } : {}),
    });

    if (!result.ok) {
      setSaveState("error");
      setMessage(result.error);
      return;
    }

    setSaveState("saved");
    const className = classes.find((classOption) => classOption.id === classId)?.name;
    setMessage(className
      ? `Saved to ${className} notes.`
      : "Saved as a general note. Diana will suggest a class when the words make it clear.");
  }

  return (
    <section className="sd-voice-note-form" aria-label="Voice note recorder">
      <div className="sd-voice-note-intro">
        <FileAudio aria-hidden="true" />
        <div>
          <h2>Speak or type your note.</h2>
          <p>Record a reminder, a class thought, or the part of an assignment you want to return to later.</p>
        </div>
      </div>

      <div className="sd-voice-note-capture">
        <div className="sd-voice-note-class">
          <label htmlFor="voice-note-class">Class <small>optional</small></label>
          <select id="voice-note-class" value={classId} onChange={(event) => setClassId(event.target.value)}>
            {classes.map((classOption) => <option key={classOption.id} value={classOption.id}>{classOption.name}</option>)}
            <option value="">General note</option>
          </select>
        </div>
        <VoiceTextarea
          provider="openai"
          showDeviceStatus
          value={transcript}
          onChange={(event) => updateTranscript(event.target.value)}
          onTranscript={addTranscript}
          rows={8}
          dictationLabel="Record voice note"
          aria-label="Voice note"
          className="sd-voice-note-textarea"
          placeholder="Your transcription will appear here. You can also type your note."
        />
      </div>

      <div className="sd-voice-note-actions">
        <p><FileAudio aria-hidden="true" /> Your note stays attached to the original words you shared.</p>
        <div>
          {transcript.trim() && saveState !== "saved" ? (
            <button type="button" className="sd-voice-note-clear" onClick={() => updateTranscript("")}>
              <X aria-hidden="true" /> Clear
            </button>
          ) : null}
          <button type="button" className="sd-voice-note-save" onClick={() => void saveVoiceNote()} disabled={!transcript.trim() || saveState === "saving"}>
            {saveState === "saving" ? "Saving" : saveState === "saved" ? "Saved to Work" : "Save note"}
          </button>
        </div>
      </div>

      {message ? <p className="sd-voice-note-message" data-state={saveState} role="status">{message}</p> : null}
    </section>
  );
}
