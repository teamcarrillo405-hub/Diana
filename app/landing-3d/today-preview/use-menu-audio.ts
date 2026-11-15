"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MenuAudioCue = "select" | "confirm" | "launch" | "return" | "complete";

const cues = {
  select: { duration: 0.055, frequency: 210, cutoff: 2400, clickDecay: 0.004, bodyDecay: 0.011, gain: 0.030 },
  confirm: { duration: 0.085, frequency: 240, cutoff: 1800, clickDecay: 0.006, bodyDecay: 0.017, gain: 0.034 },
  launch: { duration: 0.125, frequency: 165, cutoff: 1400, clickDecay: 0.009, bodyDecay: 0.026, gain: 0.038 },
  return: { duration: 0.065, frequency: 145, cutoff: 1000, clickDecay: 0.005, bodyDecay: 0.013, gain: 0.026 },
  complete: { duration: 0.145, frequency: 275, cutoff: 2200, clickDecay: 0.007, bodyDecay: 0.031, gain: 0.032 },
} satisfies Record<MenuAudioCue, { duration: number; frequency: number; cutoff: number; clickDecay: number; bodyDecay: number; gain: number }>;

/** Shared PCM source for live playback and local auditions, without normalization. */
export function renderMenuCue(cue: MenuAudioCue, sampleRate: number): Float32Array {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new RangeError("Unsupported audio sample rate");
  const spec = cues[cue];
  const samples = new Float32Array(Math.ceil(spec.duration * sampleRate));
  const lowPass = 1 - Math.exp(-2 * Math.PI * spec.cutoff / sampleRate);
  const highPass = 1 - Math.exp(-2 * Math.PI * 100 / sampleRate);
  let seed = 0x4449414e;
  let filtered = 0;
  let lowBody = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const time = index / sampleRate;
    // A repeatable, softened click gives every cue the same material character.
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    filtered += lowPass * (seed / 0x80000000 - 1 - filtered);
    lowBody += highPass * (filtered - lowBody);
    const click = (filtered - lowBody) * Math.exp(-time / spec.clickDecay);
    const triangle = 2 / Math.PI * Math.asin(Math.sin(2 * Math.PI * spec.frequency * time));
    const body = triangle * Math.exp(-time / spec.bodyDecay);
    const attack = Math.min(1, time / 0.001);
    const release = Math.min(1, (samples.length - 1 - index) / (sampleRate * 0.006));
    samples[index] = spec.gain * (0.8 * click + 0.2 * body) * attack * release;
  }
  return samples;
}

type Voice = {
  source?: AudioBufferSourceNode;
  gain?: GainNode;
  timer?: ReturnType<typeof setTimeout>;
};
type Connection = { context: AudioContext; onStateChange: () => void };

function audioConstructor() {
  if (typeof window === "undefined") return undefined;
  const candidate = window.AudioContext
    ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return typeof candidate === "function" ? candidate : undefined;
}

/** Toggle from a user gesture; play explicit actions, never hover or queued audio. */
export function useMenuAudio(): {
  enabled: boolean;
  available: boolean;
  toggle: () => void;
  play: (cue: MenuAudioCue) => void;
} {
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  const mounted = useRef(false);
  const optedIn = useRef(false);
  const supported = useRef(false);
  const generation = useRef(0);
  const connection = useRef<Connection | null>(null);
  const voices = useRef(new Set<Voice>());
  const lastPlayed = useRef<Partial<Record<MenuAudioCue, number>>>({});

  const releaseVoice = useCallback((voice: Voice) => {
    if (!voices.current.delete(voice)) return;
    if (voice.timer !== undefined) clearTimeout(voice.timer);
    if (voice.source) {
      voice.source.onended = null;
      try { voice.source.stop(); } catch { /* Already ended or never started. */ }
      try { voice.source.disconnect(); } catch { /* Continue releasing the gain. */ }
    }
    try { voice.gain?.disconnect(); } catch { /* The context may already be closed. */ }
  }, []);

  const stopVoices = useCallback(() => {
    for (const voice of voices.current) releaseVoice(voice);
  }, [releaseVoice]);

  const disconnect = useCallback(() => {
    stopVoices();
    const previous = connection.current;
    connection.current = null;
    if (!previous) return;
    const version = generation.current;
    const closeError = () => {
      if (!mounted.current || generation.current !== version || connection.current) return;
      supported.current = false;
      optedIn.current = false;
      setAvailable(false);
      setEnabled(false);
    };
    try {
      previous.context.removeEventListener("statechange", previous.onStateChange);
      if (previous.context.state !== "closed") void previous.context.close().catch(closeError);
    } catch {
      closeError();
    }
  }, [stopVoices]);

  const fail = useCallback(() => {
    generation.current += 1;
    supported.current = false;
    optedIn.current = false;
    if (mounted.current) {
      setEnabled(false);
      setAvailable(false);
    }
    disconnect();
  }, [disconnect]);

  useEffect(() => {
    mounted.current = true;
    supported.current = Boolean(audioConstructor());
    setAvailable(supported.current);
    return () => {
      mounted.current = false;
      optedIn.current = false;
      generation.current += 1;
      disconnect();
    };
  }, [disconnect]);

  const toggle = useCallback(() => {
    if (!mounted.current || !supported.current) return;
    generation.current += 1;
    lastPlayed.current = {};
    if (optedIn.current) {
      optedIn.current = false;
      setEnabled(false);
      disconnect();
      return;
    }

    const Constructor = audioConstructor();
    if (!Constructor) { fail(); return; }
    optedIn.current = true;
    setEnabled(true);
    const version = generation.current;
    try {
      const context = new Constructor();
      const isCurrent = () => mounted.current && optedIn.current
        && generation.current === version && connection.current?.context === context;
      const onStateChange = () => {
        if (!isCurrent()) return;
        // Interrupted contexts must not replay an old cue when the browser resumes them.
        if (context.state !== "running") stopVoices();
        if (context.state === "closed") fail();
      };
      connection.current = { context, onStateChange };
      context.addEventListener("statechange", onStateChange);
      if (context.state === "closed") { fail(); return; }
      if (context.state !== "running") {
        void context.resume().then(() => {
          if (isCurrent() && context.state !== "running") fail();
        }).catch(() => {
          if (isCurrent()) fail();
        });
      }
    } catch {
      fail();
    }
  }, [disconnect, fail, stopVoices]);

  const play = useCallback((cue: MenuAudioCue) => {
    if (!mounted.current || !optedIn.current || !supported.current) return;
    const context = connection.current?.context;
    if (!context) return;
    if (context.state === "closed") { fail(); return; }
    if (context.state !== "running") return;
    const now = context.currentTime;
    if (now - (lastPlayed.current[cue] ?? -Infinity) < 0.12) return;
    lastPlayed.current[cue] = now;

    stopVoices();
    const voice: Voice = {};
    voices.current.add(voice);
    try {
      const source = context.createBufferSource();
      voice.source = source;
      const gain = context.createGain();
      voice.gain = gain;
      const samples = renderMenuCue(cue, context.sampleRate);
      const buffer = context.createBuffer(1, samples.length, context.sampleRate);
      buffer.getChannelData(0).set(samples);
      source.buffer = buffer;
      gain.gain.setValueAtTime(1, now);
      source.connect(gain);
      gain.connect(context.destination);
      source.onended = () => releaseVoice(voice);
      source.start(now);
      // Also release nodes if an interrupted context never delivers ended.
      voice.timer = setTimeout(() => releaseVoice(voice), buffer.duration * 1000 + 30);
    } catch {
      fail();
    }
  }, [fail, releaseVoice, stopVoices]);

  return { enabled, available, toggle, play };
}
