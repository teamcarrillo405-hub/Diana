"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Mic, Square, Upload } from "lucide-react";

import { scoreClassMatch, type ClassCandidate } from "@/lib/notes/class-router";
import { ALLOWED_EXTENSIONS, validateAudioFile } from "@/lib/notes/upload-validation";
import { triggerAudioTranscription, uploadNoteAudio } from "../actions";

export interface AudioUploadTabProps {
  ensureNoteId: () => Promise<string | null>;
  onTranscriptReady: (text: string) => void;
  onClassSuggested: (classId: string | null) => void;
  classCandidates: ClassCandidate[];
  mode?: "record" | "file";
}

type AudioStatus = "idle" | "recording" | "uploading" | "ready" | "transcribing" | "done" | "tooShort" | "error";

const ACCEPT_ATTR = ALLOWED_EXTENSIONS.map((extension) => `.${extension}`).join(",") + ",audio/*";
const WAVEFORM_BAR_HEIGHTS = [14, 24, 18, 32, 22, 28, 16, 36, 20, 30, 17, 34, 23, 29, 15, 31, 19, 26];

export function AudioUploadTab({
  ensureNoteId,
  onTranscriptReady,
  onClassSuggested,
  classCandidates,
  mode = "file",
}: AudioUploadTabProps) {
  const [status, setStatus] = useState<AudioStatus>("idle");
  const [message, setMessage] = useState("");
  const [audio, setAudio] = useState<{ noteId: string; storageKey: string; fileName: string; previewUrl: string } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [isPending, startTransition] = useTransition();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const discardOnStopRef = useRef(false);
  const meterCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (status !== "recording") return;
    const interval = window.setInterval(() => {
      if (startedAtRef.current) setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)));
    }, 250);
    return () => window.clearInterval(interval);
  }, [status]);

  useEffect(() => () => {
    discardOnStopRef.current = true;
    stopVoiceMeter();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (audio?.previewUrl) URL.revokeObjectURL(audio.previewUrl);
  }, [audio?.previewUrl]);

  function stopVoiceMeter() {
    meterCleanupRef.current?.();
    meterCleanupRef.current = null;
    setVoiceLevel(0);
  }

  function startVoiceMeter(stream: MediaStream) {
    stopVoiceMeter();
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    const source = audioContext.createMediaStreamSource(stream);
    const data = new Uint8Array(analyser.fftSize);
    let frame = 0;
    let stopped = false;
    source.connect(analyser);

    const tick = () => {
      if (stopped) return;
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (const value of data) {
        const centered = (value - 128) / 128;
        sumSquares += centered * centered;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      setVoiceLevel(Math.min(1, rms * 8));
      frame = window.requestAnimationFrame(tick);
    };

    tick();
    meterCleanupRef.current = () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      source.disconnect();
      void audioContext.close();
    };
  }

  function displayError(error: unknown, fallback: string) {
    const message = error instanceof Error ? error.message : fallback;
    setStatus("error");
    setMessage(message || fallback);
  }

  async function saveAudio(file: File) {
    const validation = validateAudioFile(file);
    if (!validation.ok) {
      setStatus("error");
      setMessage(validation.error ?? "Choose an audio file Diana can save.");
      return;
    }

    setStatus("uploading");
    setMessage("Saving your audio.");
    const noteId = await ensureNoteId();
    if (!noteId) {
      setStatus("error");
      setMessage("Diana could not create your note. Refresh and try again.");
      return;
    }

    const formData = new FormData();
    formData.append("noteId", noteId);
    formData.append("audio", file);
    formData.append("source", mode === "record" ? "voice" : "audio_upload");
    const uploaded = await uploadNoteAudio(formData);
    if (!uploaded.ok) {
      setStatus("error");
      setMessage(uploaded.error);
      return;
    }

    setAudio((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return { noteId, storageKey: uploaded.storageKey, fileName: file.name, previewUrl: URL.createObjectURL(file) };
    });
    setStatus("ready");
    setMessage("Audio saved. Transcribe it when you are ready.");
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    startTransition(() => void saveAudio(file));
  }

  async function startRecording() {
    if (status === "recording" || isPending) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("error");
      setMessage("Recording is not available in this browser. Add an audio file instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      discardOnStopRef.current = false;
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      setElapsedSeconds(0);
      setMessage("Recording. Keep going until you press Stop recording.");
      setStatus("recording");
      startVoiceMeter(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stopVoiceMeter();
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        const chunks = chunksRef.current;
        chunksRef.current = [];
        if (discardOnStopRef.current) return;
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (blob.size < 1_200) {
          setStatus("error");
          setMessage("That recording was too short to save. Try again when you are ready.");
          return;
        }
        const file = new File([blob], `diana-note-${Date.now()}.webm`, { type: "audio/webm" });
        void saveAudio(file);
      };
      recorder.onerror = () => {
        stopVoiceMeter();
        stream.getTracks().forEach((track) => track.stop());
        setStatus("error");
        setMessage("Diana could not keep that recording. Check your microphone and try again.");
      };
      recorder.start();
    } catch (error) {
      displayError(error, "Diana could not access your microphone. Check browser and Windows microphone permission.");
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setMessage("Saving your recording.");
    stopVoiceMeter();
    recorder.stop();
  }

  function transcribeAudio() {
    if (!audio || status === "transcribing") return;
    setStatus("transcribing");
    setMessage("Transcribing your audio.");
    startTransition(async () => {
      const result = await triggerAudioTranscription({ noteId: audio.noteId, storageKey: audio.storageKey });
      if (!result.ok) {
        setStatus("error");
        setMessage(result.error);
        return;
      }
      if ("bodyTooShort" in result && result.bodyTooShort) {
        setStatus("tooShort");
        setMessage("Audio saved. Diana did not hear enough words to make a transcript.");
        return;
      }
      onTranscriptReady(result.text);
      onClassSuggested(scoreClassMatch(result.text, classCandidates));
      setStatus("done");
      setMessage("Transcript added to your note.");
    });
  }

  const isRecording = status === "recording";
  const voiceStatus = voiceLevel >= 0.06 ? "Sound is coming through." : "Speak normally. The bars will move with your voice.";
  const visibleWaveLevel = Math.max(0.14, voiceLevel);
  return <section className="notes-audio-capture" aria-live="polite">
    {mode === "record" ? (
      <div className="notes-audio-recording-control">
        <p>{isRecording ? "Recording audio" : "Record an audio note"}</p>
        <span>{isRecording ? formatElapsed(elapsedSeconds) : "Press Start, then stop when you are finished."}</span>
        {isRecording ? <div className="notes-audio-waveform" aria-label={voiceStatus}>
          <div className="notes-audio-waveform-bars" aria-hidden="true">
            {WAVEFORM_BAR_HEIGHTS.map((height, index) => <i key={index} style={{
              height: `${Math.round(5 + height * visibleWaveLevel)}px`,
              opacity: 0.3 + visibleWaveLevel * 0.7,
            }} />)}
          </div>
          <small>{voiceStatus}</small>
        </div> : null}
        <button type="button" onClick={isRecording ? stopRecording : () => void startRecording()} disabled={isPending || status === "uploading" || status === "transcribing"} data-recording={isRecording || undefined}>
          {isRecording ? <Square size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
          {isRecording ? "Stop recording" : "Start recording"}
        </button>
      </div>
    ) : (
      <label className="notes-audio-file-picker">
        <span><Upload size={16} aria-hidden="true" /> Choose an audio file</span>
        <input type="file" accept={ACCEPT_ATTR} onChange={handleFileSelect} disabled={isPending || status === "uploading" || status === "transcribing"} />
        <small>Supports .m4a, .mp3, .wav, and .webm.</small>
      </label>
    )}

    {audio ? <div className="notes-audio-ready">
      <div><strong>{audio.fileName}</strong><span>{message}</span></div>
      <audio controls src={audio.previewUrl}>Your browser cannot play this recording.</audio>
      <button type="button" onClick={transcribeAudio} disabled={status === "transcribing" || isPending}>
        {status === "transcribing" ? "Transcribing audio" : "Transcribe audio"}
      </button>
    </div> : null}
    {!audio && message ? <p className={`notes-audio-message${status === "error" ? " is-error" : ""}`}>{message}</p> : null}
  </section>;
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}
