// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { performance as userTiming, PerformanceObserver } from "node:perf_hooks";
import { DianaIdleCharacter } from "./diana-idle-character";
import { DIANA_FLOOR, type DianaPose } from "./diana-ground-plane";
import sceneAssets from "./diana-scene-assets.json";

let media: Map<string, { matches: boolean; listener?: () => void }>;
let intersect: (entries: { isIntersecting: boolean }[]) => void;
let alpha = 0;
let subjectAlpha = 255;
let play: Mock<() => Promise<void>>;
let pause: Mock<() => void>;
let frames: Map<number, (now: number) => void>;
let nextFrame: number;
let draw: Mock;
let clear: Mock;
let read: Mock;

beforeEach(() => {
  media = new Map();
  alpha = 0;
  subjectAlpha = 255;
  frames = new Map();
  nextFrame = 0;
  draw = vi.fn();
  clear = vi.fn();
  read = vi.fn((x: number) => ({ data: new Uint8ClampedArray([0, 0, 0, x === 0 ? alpha : subjectAlpha]) }));
  Object.defineProperty(HTMLVideoElement.prototype, "requestVideoFrameCallback", { configurable: true, value: vi.fn((callback: (now: number) => void) => { frames.set(++nextFrame, callback); return nextFrame; }) });
  Object.defineProperty(HTMLVideoElement.prototype, "cancelVideoFrameCallback", { configurable: true, value: vi.fn((id: number) => frames.delete(id)) });
  play = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  pause = vi.fn<() => void>();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(pause);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ({
    canvas: {}, save: vi.fn(), restore: vi.fn(), setTransform: vi.fn(), resetTransform: vi.fn(),
    fillRect: vi.fn(), beginPath: vi.fn(), ellipse: vi.fn(), fill: vi.fn(),
    createLinearGradient: () => ({ addColorStop: vi.fn() }),
    clearRect: clear, drawImage: draw, getImageData: read,
  }) as never);
  vi.stubGlobal("matchMedia", vi.fn((query: string) => {
    const state = { matches: query === "(min-width: 761px)", listener: undefined as (() => void) | undefined };
    media.set(query, state);
    return { get matches() { return state.matches; }, addEventListener: (_: string, fn: () => void) => { state.listener = fn; }, removeEventListener: vi.fn() };
  }));
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: typeof intersect) { intersect = callback; }
    observe() { intersect([{ isIntersecting: true }]); }
    disconnect() {}
  });
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

function paintFrame(now = 0) {
  act(() => {
    const [id, callback] = frames.entries().next().value!;
    frames.delete(id);
    callback(now);
  });
}

function changeMedia(query: string, matches: boolean) {
  act(() => { const state = media.get(query)!; state.matches = matches; state.listener?.(); });
}

function expectShoeContacts(container: HTMLElement, pose: DianaPose) {
  const contacts = container.querySelectorAll<HTMLElement>("[data-diana-contact]");
  expect(contacts).toHaveLength(2);
  contacts.forEach((contact, index) => {
    const [x, y, radius] = DIANA_FLOOR[pose].shoes[index];
    const left = parseFloat(contact.style.left) / 100 * DIANA_FLOOR.sourceWidth;
    const top = parseFloat(contact.style.top) / 100 * DIANA_FLOOR.sourceHeight;
    const width = parseFloat(contact.style.width) / 100 * DIANA_FLOOR.sourceWidth;
    const height = parseFloat(contact.style.height) / 100 * DIANA_FLOOR.sourceHeight;
    expect(left + width / 2).toBeCloseTo(x);
    expect(top + height / 2).toBeCloseTo(y);
    expect(width / 2).toBeCloseTo(radius);
    expect(height / 2).toBeCloseTo(DIANA_FLOOR.contactRadiusY);
  });
}

describe("Diana idle review", () => {
  it.each(["original", "relit"] as const)("uses the supplied %s motion pose for live, paused, restored, and fallback floor alignment", pose => {
    const assets = { poster: "/matching.png", motion: "/matching.webm", posterPose: pose, motionPose: pose };
    const { container, rerender } = render(<DianaIdleCharacter paused={false} assets={assets} displayGrade="none" />);
    const holder = container.querySelector<HTMLElement>("[data-floor-pose]")!;
    expect(holder.style.getPropertyValue("--diana-floor-shift")).toBe(pose === "original" ? "49%" : "31%");
    paintFrame();
    expectShoeContacts(container, pose);
    expect(holder.getAttribute("data-floor-pose")).toBe(pose);
    const ground = container.querySelector("[data-diana-ground]")!;
    fireEvent(ground, new Event("contextlost"));
    fireEvent(ground, new Event("contextrestored"));
    expect(holder.getAttribute("data-floor-ready")).toBe("true");
    rerender(<DianaIdleCharacter paused assets={assets} displayGrade="none" />);
    expectShoeContacts(container, pose);
    changeMedia("(prefers-reduced-motion: reduce)", true);
    expectShoeContacts(container, pose);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector<HTMLImageElement>("[data-motion-poster]")!.style.filter).toBe("none");
  });

  it.each(["original", "motion", "relit"] as const)("keeps %s poster contacts aligned through motion and floor-context loss", posterPose => {
    const assets = { poster: sceneAssets.matchingPoster.src, motion: sceneAssets.motion.src, posterPose };
    const { container } = render(<DianaIdleCharacter paused={false} assets={assets} />);
    expectShoeContacts(container, posterPose);
    paintFrame();
    expectShoeContacts(container, "motion");
    for (const selector of ["[data-diana-ground]", "[data-diana-reflection-buffer]"]) {
      const floor = container.querySelector(selector)!;
      fireEvent(floor, new Event("contextlost"));
      expect(container.querySelector("[data-floor-ready]")?.getAttribute("data-floor-ready")).toBe("false");
      expectShoeContacts(container, "motion");
      expect(container.querySelector("video")).not.toBeNull();
      fireEvent(floor, new Event("contextrestored"));
      expect(container.querySelector("[data-floor-ready]")?.getAttribute("data-floor-ready")).toBe("true");
      expectShoeContacts(container, "motion");
    }
    fireEvent.error(container.querySelector("video")!);
    expectShoeContacts(container, posterPose);
  });

  it("coordinates the CSS display grade across loading, playback, and reduced motion without restarting media", () => {
    const assets = { poster: sceneAssets.matchingPoster.src, motion: sceneAssets.motion.src, posterPose: "motion" as const };
    const { container, rerender } = render(<DianaIdleCharacter paused={false} assets={assets} />);
    const poster = container.querySelector<HTMLImageElement>("[data-motion-poster]")!;
    const surface = container.querySelector<HTMLCanvasElement>("[data-motion-surface]")!;
    const reflection = container.querySelector<HTMLCanvasElement>("[data-diana-reflection-buffer]")!;
    const shadows = container.querySelector<HTMLCanvasElement>("[data-diana-ground]")!;
    expect(poster.style.filter).toBe("var(--diana-display-grade, none)");
    expect(surface.style.filter).toBe(poster.style.filter);
    expect(reflection.style.filter).toBe(poster.style.filter);
    expect(shadows.style.filter).toBe("");
    expect(shadows.parentElement!.style.filter).toBe("");
    expect(reflection.hidden).toBe(false);
    const player = container.querySelector("video")!;
    player.currentTime = 3;
    paintFrame();
    const plays = play.mock.calls.length;
    const displayGrade = "brightness(.96) saturate(.94)";
    rerender(<DianaIdleCharacter paused={false} assets={assets} displayGrade={displayGrade} />);
    expect(poster.style.filter).toBe(displayGrade);
    expect(surface.style.filter).toBe(displayGrade);
    expect(reflection.style.filter).toBe(displayGrade);
    expect(shadows.style.filter).toBe("");
    for (const contact of container.querySelectorAll<HTMLElement>("[data-diana-contact]")) expect(contact.style.filter).toBe("");
    expect(container.querySelector("video")).toBe(player);
    expect(player.currentTime).toBe(3);
    expect(play).toHaveBeenCalledTimes(plays);
    changeMedia("(prefers-reduced-motion: reduce)", true);
    expect(container.querySelector("video")).toBeNull();
    expect(poster.getAttribute("data-hidden")).toBe("false");
    expect(poster.style.filter).toBe(displayGrade);
    expect(reflection.style.filter).toBe(displayGrade);
  });

  it("repaints a paused floor when selecting satin without advancing the character", () => {
    const assets = { poster: sceneAssets.matchingPoster.src, motion: sceneAssets.motion.src, posterPose: "motion" as const };
    const { container, rerender } = render(<DianaIdleCharacter paused={false} assets={assets} />);
    paintFrame();
    const player = container.querySelector("video")!;
    player.currentTime = 3;
    rerender(<DianaIdleCharacter paused assets={assets} />);
    draw.mockClear();
    rerender(<DianaIdleCharacter paused assets={assets} floorMaterial="satin" />);
    expect(container.querySelector("[data-floor-material]")?.getAttribute("data-floor-material")).toBe("satin");
    expect(container.querySelector("[data-floor-ready]")?.getAttribute("data-floor-ready")).toBe("true");
    expect(draw).toHaveBeenCalledTimes(2);
    expect(container.querySelector("video")).toBe(player);
    expect(player.currentTime).toBe(3);
    expect(frames.size).toBe(0);
    expectShoeContacts(container, "motion");
  });

  it("keeps the matching poster and floor pose through Still, Motion, and reduced-motion switches", () => {
    const assets = { poster: sceneAssets.matchingPoster.src, motion: sceneAssets.motion.src, posterPose: "motion" as const };
    const { container, rerender } = render(<DianaIdleCharacter paused={false} enabled={false} assets={assets} />);
    const poster = container.querySelector<HTMLImageElement>("[data-motion-poster]")!;
    expect(poster.getAttribute("src")).toBe(sceneAssets.matchingPoster.src);
    expect(poster.getAttribute("srcset")).toBeNull();
    expect(poster.style.filter).toBe("var(--diana-display-grade, none)");
    expect(container.querySelector("[data-floor-pose]")?.getAttribute("data-floor-pose")).toBe("motion");
    expect(container.querySelector("video")).toBeNull();
    rerender(<DianaIdleCharacter paused={false} enabled assets={assets} />);
    paintFrame();
    expect(poster.getAttribute("data-hidden")).toBe("true");
    changeMedia("(prefers-reduced-motion: reduce)", true);
    expect(poster.getAttribute("data-hidden")).toBe("false");
    expect(container.querySelector("[data-floor-pose]")?.getAttribute("data-floor-pose")).toBe("motion");
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("[data-motion-surface]")).toBeNull();
    changeMedia("(prefers-reduced-motion: reduce)", false);
    expect(container.querySelectorAll("video")).toHaveLength(1);
    expect(poster.getAttribute("data-hidden")).toBe("false");
    paintFrame();
    expect(poster.getAttribute("data-hidden")).toBe("true");
    rerender(<DianaIdleCharacter paused={false} enabled={false} assets={assets} />);
    expect(poster.getAttribute("src")).toBe(sceneAssets.matchingPoster.src);
    expect(container.querySelector("[data-floor-pose]")?.getAttribute("data-floor-pose")).toBe("motion");
  });

  it("restores the matching poster and its floor after a decoded motion frame errors", () => {
    const assets = { poster: sceneAssets.matchingPoster.src, motion: sceneAssets.motion.src, posterPose: "motion" as const };
    const { container } = render(<DianaIdleCharacter paused={false} assets={assets} />);
    paintFrame();
    fireEvent.error(container.querySelector("video")!);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("[data-motion-poster]")?.getAttribute("src")).toBe(sceneAssets.matchingPoster.src);
    expect(container.querySelector("[data-motion-poster]")?.getAttribute("data-hidden")).toBe("false");
    expect(container.querySelector("[data-floor-pose]")?.getAttribute("data-floor-pose")).toBe("motion");
  });

  it("opts into versioned scene assets with one decoder and frame-matched floor", () => {
    const assets = { poster: "/assets/today-now/approved.png", motion: "/assets/today-now/approved.webm", posterPose: "original" as const };
    const { container, rerender } = render(<DianaIdleCharacter paused={false} assets={assets} />);
    expect(container.querySelector("video")?.getAttribute("src")).toBe(assets.motion);
    expect((container.querySelector("[data-motion-poster]") as HTMLImageElement).style.filter).toBe("var(--diana-display-grade, none)");
    expect(container.querySelectorAll("video")).toHaveLength(1);
    expect(container.querySelector("[data-diana-ground]")).not.toBeNull();
    paintFrame();
    expect(container.querySelector("[data-floor-ready]")?.getAttribute("data-floor-ready")).toBe("true");
    expect(container.querySelector("[data-floor-pose]")?.getAttribute("data-floor-pose")).toBe("motion");
    const drawings = draw.mock.calls.length;
    rerender(<DianaIdleCharacter paused assets={assets} />);
    expect(draw.mock.calls.length).toBe(drawings);
    expect(frames.size).toBe(0);
    rerender(<DianaIdleCharacter paused={false} enabled={false} assets={assets} />);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("[data-floor-pose]")?.getAttribute("data-floor-pose")).toBe("original");
  });

  it("keeps the scene fallback usable after media errors and for reduced motion", () => {
    const assets = { poster: "/assets/today-now/approved.png", motion: "/assets/today-now/approved.webm", posterPose: "motion" as const };
    const { container } = render(<DianaIdleCharacter paused={false} assets={assets} />);
    fireEvent.error(container.querySelector("video")!);
    expect(container.querySelector("[data-motion-poster]")?.getAttribute("data-hidden")).toBe("false");
    expect(container.querySelector("[data-floor-pose]")?.getAttribute("data-floor-pose")).toBe("motion");
    changeMedia("(prefers-reduced-motion: reduce)", true);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("[data-motion-surface]")).toBeNull();
  });

  it.each(["data-diana-ground", "data-diana-reflection-buffer"])("restores contact fallback if %s loses its context while paused", attribute => {
    const assets = { poster: "/assets/today-now/approved.png", motion: "/assets/today-now/approved.webm", posterPose: "original" as const };
    const { container, rerender } = render(<DianaIdleCharacter paused={false} assets={assets} />);
    paintFrame();
    rerender(<DianaIdleCharacter paused assets={assets} />);
    const element = container.querySelector(`[${attribute}]`)!;
    const loss = new Event("contextlost", { cancelable: true });
    fireEvent(element, loss);
    expect(loss.defaultPrevented).toBe(false);
    expect(container.querySelector("[data-floor-ready]")?.getAttribute("data-floor-ready")).toBe("false");
    play.mockClear();
    fireEvent(element, new Event("contextrestored"));
    expect(container.querySelector("[data-floor-ready]")?.getAttribute("data-floor-ready")).toBe("true");
    expect(play).not.toHaveBeenCalled();
  });

  it("keeps the exact still visible until decoded transparency is verified", () => {
    const { container } = render(<DianaIdleCharacter paused={false} />);
    const poster = container.querySelector("[data-motion-poster]")!;
    expect(poster.getAttribute("data-hidden")).toBe("false");
    fireEvent.loadedData(container.querySelector("video")!);
    expect(poster.getAttribute("data-hidden")).toBe("false");
    paintFrame();
    fireEvent.playing(container.querySelector("video")!);
    expect(poster.getAttribute("data-hidden")).toBe("true");
    expect(container.querySelector("[data-diana-motion]")?.getAttribute("data-diana-motion")).toBe("playing");
    expect(play).toHaveBeenCalled();
  });

  it("falls back when a browser decodes VP9 without transparency", () => {
    alpha = 255;
    const { container } = render(<DianaIdleCharacter paused={false} />);
    paintFrame();
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("[data-motion-poster]")?.getAttribute("data-hidden")).toBe("false");
  });

  it("falls back on a missing or unsupported video", () => {
    const { container } = render(<DianaIdleCharacter paused={false} />);
    fireEvent.error(container.querySelector("video")!);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("[data-diana-motion]")?.getAttribute("data-diana-motion")).toBe("unavailable");
  });

  it("uses the still without loading video for reduced motion or the inactive screen size", () => {
    const { container } = render(<DianaIdleCharacter paused={false} />);
    changeMedia("(prefers-reduced-motion: reduce)", true);
    expect(container.querySelector("video")).toBeNull();
    changeMedia("(prefers-reduced-motion: reduce)", false);
    expect(container.querySelector("canvas")?.getAttribute("data-ready")).toBe("false");
    changeMedia("(min-width: 761px)", false);
    expect(container.querySelector("video")).toBeNull();
  });

  it("pauses without replacing the current frame and resumes only on request", () => {
    const { container, rerender } = render(<DianaIdleCharacter paused={false} />);
    const player = container.querySelector("video")!;
    paintFrame();
    rerender(<DianaIdleCharacter paused />);
    expect(container.querySelector("video")).toBe(player);
    expect(container.querySelector("[data-diana-motion]")?.getAttribute("data-diana-motion")).toBe("paused");
    expect(container.querySelector("[data-motion-poster]")?.getAttribute("data-hidden")).toBe("true");
    expect(pause).toHaveBeenCalled();
    play.mockClear();
    act(() => intersect([{ isIntersecting: false }]));
    rerender(<DianaIdleCharacter paused={false} />);
    expect(play).not.toHaveBeenCalled();
    act(() => intersect([{ isIntersecting: true }]));
    expect(play).toHaveBeenCalled();
  });

  it("pauses while the page is hidden", () => {
    const { container } = render(<DianaIdleCharacter paused={false} />);
    paintFrame();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    fireEvent(document, new Event("visibilitychange"));
    expect(container.querySelector("[data-diana-motion]")?.getAttribute("data-diana-motion")).toBe("paused");
  });

  it("falls back when autoplay is blocked", async () => {
    play.mockRejectedValue(new DOMException("Blocked", "NotAllowedError"));
    const { container } = render(<DianaIdleCharacter paused={false} />);
    await waitFor(() => expect(container.querySelector("video")).toBeNull());
  });

  it("starts with a fresh decoder after a user-requested restart", async () => {
    play.mockRejectedValueOnce(new DOMException("Blocked", "NotAllowedError"));
    const { container, rerender } = render(<DianaIdleCharacter key="first" paused={false} />);
    await waitFor(() => expect(container.querySelector("video")).toBeNull());
    rerender(<DianaIdleCharacter key="restart" paused={false} />);
    const player = container.querySelector("video")!;
    expect(player).toBeTruthy();
    paintFrame();
    fireEvent.playing(player);
    expect(container.querySelector("[data-diana-motion]")?.getAttribute("data-diana-motion")).toBe("playing");
    expect(container.querySelector("[data-motion-poster]")?.getAttribute("data-hidden")).toBe("true");
  });

  it("reports playback events and resets loop diagnostics for replacement videos", () => {
    const onStatusChange = vi.fn();
    const { container } = render(<DianaIdleCharacter paused={false} onStatusChange={onStatusChange} />);
    let player = container.querySelector("video")!;
    paintFrame();
    expect(onStatusChange).toHaveBeenLastCalledWith("paused");
    fireEvent.playing(player);
    expect(onStatusChange).toHaveBeenLastCalledWith("playing");
    Object.defineProperty(player, "currentTime", { value: 7.5, configurable: true });
    fireEvent.timeUpdate(player);
    Object.defineProperty(player, "currentTime", { value: 0.2, configurable: true });
    fireEvent.timeUpdate(player);
    expect(container.querySelector("[data-loop-count]")?.getAttribute("data-loop-count")).toBe("1");
    changeMedia("(prefers-reduced-motion: reduce)", true);
    expect(onStatusChange).toHaveBeenLastCalledWith("reduced-motion");
    changeMedia("(prefers-reduced-motion: reduce)", false);
    player = container.querySelector("video")!;
    expect(container.querySelector("canvas")?.getAttribute("data-ready")).toBe("false");
    expect(container.querySelector("[data-loop-count]")?.getAttribute("data-loop-count")).toBe("0");
  });

  it("does not reveal a blank transparent frame", () => {
    subjectAlpha = 0;
    const { container } = render(<DianaIdleCharacter paused={false} />);
    paintFrame();
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("[data-motion-poster]")?.getAttribute("data-hidden")).toBe("false");
  });

  it("switches to the approved still without playing a hidden video", () => {
    const { container, rerender } = render(<DianaIdleCharacter paused={false} />);
    paintFrame();
    rerender(<DianaIdleCharacter paused={false} enabled={false} />);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("[data-motion-poster]")?.getAttribute("data-hidden")).toBe("false");
    rerender(<DianaIdleCharacter paused={false} enabled />);
    expect(container.querySelector("canvas")?.getAttribute("data-ready")).toBe("false");
  });

  it("replaces each frame without trails and cancels stale callbacks on pause and unmount", () => {
    const { rerender, unmount } = render(<DianaIdleCharacter paused={false} />);
    paintFrame();
    paintFrame();
    expect(clear).toHaveBeenNthCalledWith(1, 0, 0, 564, 1440);
    expect(clear.mock.invocationCallOrder[1]).toBeLessThan(draw.mock.invocationCallOrder[1]);
    expect(draw).toHaveBeenCalledTimes(2);
    expect(frames.size).toBe(1);
    const stale = [...frames.values()][0];
    rerender(<DianaIdleCharacter paused />);
    expect(frames.size).toBe(0);
    act(() => stale(0));
    expect(draw).toHaveBeenCalledTimes(2);
    rerender(<DianaIdleCharacter paused={false} />);
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
  });

  it("cancels drawing offscreen and while hidden", () => {
    render(<DianaIdleCharacter paused={false} />);
    paintFrame();
    act(() => intersect([{ isIntersecting: false }]));
    expect(frames.size).toBe(0);
    act(() => intersect([{ isIntersecting: true }]));
    expect(frames.size).toBe(1);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    fireEvent(document, new Event("visibilitychange"));
    expect(frames.size).toBe(0);
  });

  it("falls back if no decoded frame arrives within eight seconds", () => {
    vi.useFakeTimers();
    const { container } = render(<DianaIdleCharacter paused={false} />);
    act(() => vi.advanceTimersByTime(8000));
    expect(container.querySelector("video")).toBeNull();
    expect(frames.size).toBe(0);
  });

  it.each(["silent", "waiting"])("restores the approved poster after a three-second %s stall following playback", mode => {
    vi.useFakeTimers();
    const assets = { poster: sceneAssets.matchingPoster.src, motion: sceneAssets.motion.src, posterPose: "motion" as const };
    const { container } = render(<DianaIdleCharacter paused={false} assets={assets} />);
    paintFrame();
    const stale = [...frames.values()][0];
    if (mode === "waiting") fireEvent.waiting(container.querySelector("video")!);
    act(() => vi.advanceTimersByTime(2999));
    expect(container.querySelector("[data-motion-poster]")?.getAttribute("data-hidden")).toBe("true");
    act(() => vi.advanceTimersByTime(1));
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("[data-motion-surface]")).toBeNull();
    expect(container.querySelector("[data-motion-poster]")?.getAttribute("src")).toBe(assets.poster);
    expect(container.querySelector("[data-motion-poster]")?.getAttribute("data-hidden")).toBe("false");
    expect(container.querySelector("[data-floor-pose]")?.getAttribute("data-floor-pose")).toBe("motion");
    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    const drawings = draw.mock.calls.length;
    act(() => stale(3000));
    expect(draw).toHaveBeenCalledTimes(drawings);
  });

  it("refreshes the active watchdog from each good frame without accumulating timers", () => {
    vi.useFakeTimers();
    const { container } = render(<DianaIdleCharacter paused={false} />);
    paintFrame();
    for (let now = 2000; now <= 10000; now += 2000) {
      act(() => vi.advanceTimersByTime(2000));
      paintFrame(now);
      expect(container.querySelector("video")).not.toBeNull();
      expect(vi.getTimerCount()).toBe(1);
      expect(frames.size).toBe(1);
    }
    act(() => vi.advanceTimersByTime(2999));
    expect(container.querySelector("video")).not.toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(container.querySelector("video")).toBeNull();
  });

  it.each([
    ["paused", false], ["hidden", false], ["offscreen", false],
    ["paused", true], ["hidden", true], ["offscreen", true],
  ] as const)("does not count %s time toward the watchdog (painted=%s)", (mode, started) => {
    vi.useFakeTimers();
    const visible = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    const { container, rerender } = render(<DianaIdleCharacter paused={false} />);
    if (started) paintFrame();
    act(() => vi.advanceTimersByTime(1000));
    const stale = [...frames.values()][0];
    if (mode === "paused") rerender(<DianaIdleCharacter paused />);
    if (mode === "offscreen") act(() => intersect([{ isIntersecting: false }]));
    if (mode === "hidden") {
      visible.mockReturnValue("hidden");
      fireEvent(document, new Event("visibilitychange"));
    }
    expect(vi.getTimerCount()).toBe(0);
    expect(frames.size).toBe(0);
    const readings = read.mock.calls.length;
    act(() => { vi.advanceTimersByTime(12000); stale(13000); });
    expect(read).toHaveBeenCalledTimes(readings);
    expect(container.querySelector("video")).not.toBeNull();
    if (mode === "paused") rerender(<DianaIdleCharacter paused={false} />);
    if (mode === "offscreen") act(() => intersect([{ isIntersecting: true }]));
    if (mode === "hidden") {
      visible.mockReturnValue("visible");
      fireEvent(document, new Event("visibilitychange"));
    }
    expect(frames.size).toBe(1);
    const allowance = started ? 3000 : 8000;
    act(() => vi.advanceTimersByTime(allowance - 1));
    expect(container.querySelector("video")).not.toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(container.querySelector("video")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["still", "reduced-motion", "unmount"])("cleans up the watchdog and pending frame on %s", mode => {
    vi.useFakeTimers();
    const { rerender, unmount } = render(<DianaIdleCharacter paused={false} />);
    paintFrame();
    expect(vi.getTimerCount()).toBe(1);
    if (mode === "still") rerender(<DianaIdleCharacter paused={false} enabled={false} />);
    if (mode === "reduced-motion") changeMedia("(prefers-reduced-motion: reduce)", true);
    if (mode === "unmount") unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(frames.size).toBe(0);
  });

  it("detects post-start transparent frames with one small readback per second", () => {
    const assets = { poster: sceneAssets.matchingPoster.src, motion: sceneAssets.motion.src, posterPose: "motion" as const };
    const { container } = render(<DianaIdleCharacter paused={false} assets={assets} />);
    paintFrame(0);
    expect(read).toHaveBeenCalledTimes(2);
    subjectAlpha = 0;
    for (let now = 40; now < 1000; now += 40) paintFrame(now);
    paintFrame(999);
    expect(read).toHaveBeenCalledTimes(2);
    expect(container.querySelector("video")).not.toBeNull();
    paintFrame(1000);
    expect(read).toHaveBeenCalledTimes(3);
    expect(read).toHaveBeenLastCalledWith(240, 640, 8, 8);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("[data-motion-poster]")?.getAttribute("src")).toBe(assets.poster);
    expect(container.querySelector("[data-motion-poster]")?.getAttribute("data-hidden")).toBe("false");
    expect(frames.size).toBe(0);
  });

  it("accepts a nonblank torso sample without requiring every pixel to be opaque", () => {
    const { container } = render(<DianaIdleCharacter paused={false} />);
    paintFrame(0);
    const patch = new Uint8ClampedArray(8 * 8 * 4);
    patch[patch.length - 1] = 32;
    read.mockReturnValue({ data: patch });
    paintFrame(1000);
    paintFrame(1999);
    expect(read).toHaveBeenCalledTimes(3);
    paintFrame(2000);
    expect(read).toHaveBeenCalledTimes(4);
    expect(container.querySelector("video")).not.toBeNull();
  });

  it("checks transparency immediately on the first resumed frame", () => {
    const { container, rerender } = render(<DianaIdleCharacter paused={false} />);
    paintFrame(0);
    rerender(<DianaIdleCharacter paused />);
    subjectAlpha = 0;
    rerender(<DianaIdleCharacter paused={false} />);
    paintFrame(50);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("[data-motion-poster]")?.getAttribute("data-hidden")).toBe("false");
  });

  it("keeps diagnostic measures disabled unless explicitly enabled", () => {
    const timing = { now: vi.fn(() => 0), measure: vi.fn(), clearMeasures: vi.fn() };
    vi.stubGlobal("performance", timing);
    render(<DianaIdleCharacter paused={false} />);
    paintFrame();
    timing.now.mockClear();
    paintFrame(40);
    expect(timing.measure).not.toHaveBeenCalled();
    expect(timing.clearMeasures).not.toHaveBeenCalled();
  });

  it.each([{ pixelWidth: 564, pixelHeight: 1440 }, { pixelWidth: 752, pixelHeight: 1920 }])("uses contact-only grounding on slow $pixelWidth-pixel motion without retaining frozen silhouettes", async dimensions => {
    let time = 0;
    vi.stubGlobal("performance", { now: vi.fn(() => { const value = time; time += 13; return value; }) });
    const assets = { poster: sceneAssets.matchingPoster.src, motion: sceneAssets.motion.src, posterPose: "original" as const, ...dimensions };
    const { container, rerender } = render(<DianaIdleCharacter paused={false} assets={assets} />);
    const floor = container.querySelector<HTMLElement>("[data-diana-ground]")!.parentElement!;
    const contacts = container.querySelector<HTMLElement>("[data-diana-contact]")!.parentElement!;
    for (let index = 0; index < 10; index += 1) paintFrame(index * 40);
    expect(container.querySelector("video")).not.toBeNull();
    expect(container.querySelector("[data-motion-floor]")?.getAttribute("data-motion-floor")).toBe("static");
    expect(container.querySelector("[data-diana-motion]")?.getAttribute("data-diana-motion")).not.toBe("performance-still");
    expect(floor.hidden).toBe(true);
    expect(contacts.hidden).toBe(false);
    expectShoeContacts(container, "motion");
    draw.mockClear();
    paintFrame(400);
    expect(draw).toHaveBeenCalledExactlyOnceWith(container.querySelector("video"), 0, 0, dimensions.pixelWidth, dimensions.pixelHeight);
    const player = container.querySelector("video");
    rerender(<DianaIdleCharacter paused assets={assets} floorMaterial="satin" />);
    draw.mockClear();
    for (const selector of ["[data-diana-ground]", "[data-diana-reflection-buffer]"]) {
      fireEvent(container.querySelector(selector)!, new Event("contextrestored"));
    }
    expect(draw).not.toHaveBeenCalled();
    expect(container.querySelector("video")).toBe(player);
    expect(floor.hidden).toBe(true);
    expect(contacts.hidden).toBe(false);
    expect(frames.size).toBe(0);
    changeMedia("(prefers-reduced-motion: reduce)", true);
    expect(container.querySelector("video")).toBeNull();
    expect(floor.hidden).toBe(true);
    expect(contacts.hidden).toBe(false);
    expectShoeContacts(container, "original");
    expect(draw).not.toHaveBeenCalled();
    rerender(<DianaIdleCharacter paused={false} enabled={false} assets={assets} floorMaterial="satin" />);
    expect(floor.hidden).toBe(true);
    expect(draw).not.toHaveBeenCalled();
    const poster = container.querySelector<HTMLImageElement>("[data-motion-poster]")!;
    poster.parentElement!.style.position = "absolute";
    Object.defineProperty(poster, "height", { value: 720 });
    await act(async () => fireEvent.load(poster));
    expect(draw).toHaveBeenCalledTimes(2);
    expect(draw).toHaveBeenNthCalledWith(1, poster, 0, 0, 564, 1440);
    expect(floor.hidden).toBe(false);
    expect(contacts.hidden).toBe(true);
  });

  it("preserves native 752x1920 motion pixels with normalized probes and unchanged floor geometry", () => {
    const assets = { poster: sceneAssets.matchingPoster.src, motion: sceneAssets.motion.src, posterPose: "motion" as const, pixelWidth: 752, pixelHeight: 1920 };
    const { container, rerender } = render(<DianaIdleCharacter paused={false} assets={assets} />);
    const surface = container.querySelector<HTMLCanvasElement>("[data-motion-surface]")!;
    expect([surface.width, surface.height]).toEqual([752, 1920]);
    paintFrame();
    expect(draw).toHaveBeenNthCalledWith(1, container.querySelector("video"), 0, 0, 752, 1920);
    expect(draw).toHaveBeenNthCalledWith(2, surface, 0, 0, 564, 1440);
    expect(draw).toHaveBeenNthCalledWith(3, surface, 0, 0, 564, 1440);
    expect(read).toHaveBeenNthCalledWith(2, 280, 507, 1, 1);
    paintFrame(1000);
    expect(read).toHaveBeenLastCalledWith(320, 853, 11, 11);
    rerender(<DianaIdleCharacter paused assets={assets} />);
    expect(container.querySelector("[data-motion-surface]")).toBe(surface);
    expect(surface.getAttribute("data-ready")).toBe("true");
    expect(frames.size).toBe(0);
    expectShoeContacts(container, "motion");
    changeMedia("(prefers-reduced-motion: reduce)", true);
    expect(container.querySelector("[data-motion-surface]")).toBeNull();
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("[data-motion-poster]")?.getAttribute("data-hidden")).toBe("false");
  });

  it.each(["opaque", "blank", "stall"])("retains poster/contact fallback for %s native motion", mode => {
    vi.useFakeTimers();
    const assets = { poster: sceneAssets.matchingPoster.src, motion: sceneAssets.motion.src, posterPose: "motion" as const, pixelWidth: 752, pixelHeight: 1920 };
    const { container } = render(<DianaIdleCharacter paused={false} assets={assets} />);
    if (mode === "opaque") alpha = 255;
    if (mode === "blank") subjectAlpha = 0;
    paintFrame();
    if (mode === "stall") act(() => vi.advanceTimersByTime(3000));
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("[data-motion-surface]")).toBeNull();
    expect(container.querySelector("[data-motion-poster]")?.getAttribute("data-hidden")).toBe("false");
    expect(container.querySelector<HTMLElement>("[data-diana-ground]")!.parentElement!.hidden).toBe(true);
    expect(container.querySelector<HTMLElement>("[data-diana-contact]")!.parentElement!.hidden).toBe(false);
    expectShoeContacts(container, "motion");
    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("falls back to the approved still if static-floor motion is still too slow", () => {
    let time = 0;
    vi.stubGlobal("performance", { now: vi.fn(() => { const value = time; time += 13; return value; }) });
    const assets = { poster: sceneAssets.matchingPoster.src, motion: sceneAssets.motion.src, posterPose: "motion" as const };
    const { container } = render(<DianaIdleCharacter paused={false} assets={assets} />);
    for (let index = 0; index < 20; index += 1) {
      if (!container.querySelector("video")) break;
      paintFrame(index * 40);
    }
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("[data-diana-motion]")?.getAttribute("data-diana-motion")).toBe("performance-still");
    expect(container.querySelector("[data-motion-poster]")?.getAttribute("data-hidden")).toBe("false");
    expect(container.querySelector("[data-floor-pose]")?.getAttribute("data-floor-pose")).toBe("motion");
  });

  it("measures the complete callback including floor work and clears only its own measures", () => {
    let time = 10;
    const timing = { now: vi.fn(() => time), measure: vi.fn(), clearMeasures: vi.fn() };
    vi.stubGlobal("performance", timing);
    draw.mockImplementation(() => { time += 2; });
    const assets = { poster: sceneAssets.matchingPoster.src, motion: sceneAssets.motion.src, posterPose: "motion" as const };
    const { container, rerender, unmount } = render(<DianaIdleCharacter paused={false} assets={assets} diagnostics />);
    paintFrame();
    expect(draw).toHaveBeenCalledTimes(3);
    expect(timing.measure).toHaveBeenCalledExactlyOnceWith("diana-frame", { start: 10, end: 16 });
    expect(timing.measure.mock.invocationCallOrder[0]).toBeGreaterThan(draw.mock.invocationCallOrder[2]);
    expect(timing.clearMeasures).toHaveBeenCalledExactlyOnceWith("diana-frame");
    expect(timing.clearMeasures.mock.invocationCallOrder[0]).toBeGreaterThan(timing.measure.mock.invocationCallOrder[0]);
    expect(container.querySelector("[data-floor-ready]")?.getAttribute("data-floor-ready")).toBe("true");
    const stale = [...frames.values()][0];
    rerender(<DianaIdleCharacter paused assets={assets} diagnostics />);
    act(() => stale(40));
    expect(timing.measure).toHaveBeenCalledTimes(1);
    rerender(<DianaIdleCharacter paused={false} assets={assets} diagnostics={false} />);
    paintFrame(80);
    expect(timing.measure).toHaveBeenCalledTimes(1);
    unmount();
    expect(frames.size).toBe(0);
  });

  it.each(["measure", "clearMeasures"] as const)("keeps playback working if diagnostic %s throws", method => {
    const timing = { now: vi.fn(() => 0), measure: vi.fn(), clearMeasures: vi.fn() };
    timing[method].mockImplementation(() => { throw new Error("Timing unavailable"); });
    vi.stubGlobal("performance", timing);
    const { container } = render(<DianaIdleCharacter paused={false} diagnostics />);
    paintFrame();
    paintFrame(40);
    expect(container.querySelector("video")).not.toBeNull();
    expect(frames.size).toBe(1);
    expect(timing.clearMeasures).toHaveBeenCalledTimes(2);
  });

  it("measures a drawing failure without retaining entries or scheduling more frames", () => {
    const timing = { now: vi.fn(() => 0), measure: vi.fn(), clearMeasures: vi.fn() };
    vi.stubGlobal("performance", timing);
    const { container } = render(<DianaIdleCharacter paused={false} diagnostics />);
    draw.mockImplementationOnce(() => { throw new Error("Drawing unavailable"); });
    paintFrame();
    expect(timing.measure).toHaveBeenCalledTimes(1);
    expect(timing.clearMeasures).toHaveBeenCalledExactlyOnceWith("diana-frame");
    expect(container.querySelector("video")).toBeNull();
    expect(frames.size).toBe(0);
  });

  it("delivers pending measures to an observer even after clearing the timeline", async () => {
    vi.stubGlobal("performance", userTiming);
    let observer: PerformanceObserver | undefined;
    const entries = new Promise<string[]>(resolve => {
      observer = new PerformanceObserver(list => resolve(list.getEntries().map(entry => entry.name)));
      observer.observe({ entryTypes: ["measure"] });
    });
    // Construct the observer before painting, as the QA collector must do.
    const { unmount } = render(<DianaIdleCharacter paused={false} diagnostics />);
    try {
      paintFrame();
      expect(userTiming.getEntriesByName("diana-frame")).toHaveLength(0);
      expect(await entries).toContain("diana-frame");
    } finally {
      unmount();
      observer?.disconnect();
      userTiming.clearMeasures("diana-frame");
    }
  });

  it("restores the still if drawing fails after playback starts", () => {
    const { container } = render(<DianaIdleCharacter paused={false} />);
    paintFrame();
    draw.mockImplementationOnce(() => { throw new Error("Context lost"); });
    paintFrame();
    expect(container.querySelector("canvas")).toBeNull();
    expect(container.querySelector("[data-motion-poster]")?.getAttribute("data-hidden")).toBe("false");
    expect(frames.size).toBe(0);
  });

  it("restores the still on canvas context loss", () => {
    const { container } = render(<DianaIdleCharacter paused={false} />);
    paintFrame();
    fireEvent(container.querySelector("canvas")!, new Event("contextlost"));
    expect(container.querySelector("canvas")).toBeNull();
  });

  it.each(["paused", "offscreen", "hidden"])("handles context loss while %s", mode => {
    const { container, rerender } = render(<DianaIdleCharacter paused={false} />);
    paintFrame();
    if (mode === "paused") rerender(<DianaIdleCharacter paused />);
    if (mode === "offscreen") act(() => intersect([{ isIntersecting: false }]));
    if (mode === "hidden") {
      vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
      fireEvent(document, new Event("visibilitychange"));
    }
    fireEvent(container.querySelector("canvas")!, new Event("contextlost"));
    expect(container.querySelector("canvas")).toBeNull();
    expect(container.querySelector("[data-motion-poster]")?.getAttribute("data-hidden")).toBe("false");
  });

  it("bounds waiting for the first frame after resuming", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<DianaIdleCharacter paused={false} />);
    paintFrame();
    rerender(<DianaIdleCharacter paused />);
    act(() => vi.advanceTimersByTime(10000));
    expect(container.querySelector("canvas")).not.toBeNull();
    rerender(<DianaIdleCharacter paused={false} />);
    act(() => vi.advanceTimersByTime(8000));
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("uses the still when decoded-frame callbacks are unsupported", () => {
    Object.defineProperty(HTMLVideoElement.prototype, "requestVideoFrameCallback", { configurable: true, value: undefined });
    const { container } = render(<DianaIdleCharacter paused={false} />);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("[data-diana-motion]")?.getAttribute("data-diana-motion")).toBe("unavailable");
  });
});
