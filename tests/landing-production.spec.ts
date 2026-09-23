import { expect, test } from "@playwright/test";
import sharp from "sharp";

type AnimatedWindow = Window & typeof globalThis & {
  __dianaComposition: NonNullable<Window["__dianaComposition"]> & {
    carousel: number;
    timelinePixels: number;
    scrollPixels: number;
    dayIndex: number;
    nativeEnd: number;
    readingHold: string | null;
    readingStops: {id: string; point: number}[];
    dayPlaybackStops: (number | null)[];
    videoLocked: boolean;
    videoPlayback: {currentTime: number; duration: number; angle: number; opacity: number; paused: boolean; finished: boolean}[];
    seek: (time: number) => void;
    play: () => void;
  };
};

test("anonymous visitors receive the animation assets and a moving rendered scene", async ({ page, request }, testInfo) => {
  for (const [file, contentType] of [["main.js", "javascript"], ["style.css", "text/css"], ["day-connect.mp4", "video/mp4"]]) {
    const response = await request.get(`/assets/landing-cinematic-v3/${file}`, { maxRedirects: 0 });
    expect(response.status(), file).toBe(200);
    expect(response.headers()["content-type"], file).toContain(contentType);
  }
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("body")).toHaveClass(/motion-ready/);
  await expect.poll(() => page.evaluate(() => window.__dianaComposition?.ready)).toBe(true);
  const canvas = page.locator(".scene canvas");
  await expect(canvas).toBeVisible();
  const before = await canvas.screenshot();
  const stats = await sharp(before).stats();
  expect(Math.max(...stats.channels.slice(0, 3).map((channel) => channel.stdev))).toBeGreaterThan(5);
  await page.waitForTimeout(800);
  const after = await canvas.screenshot({path: testInfo.outputPath("animated-hero.png")});
  expect(before.equals(after), "the idle scene should animate").toBe(false);
  await testInfo.attach("animated-hero", { body: after, contentType: "image/png" });
  await page.mouse.wheel(0, 1400);
  await expect.poll(() => page.evaluate(() => window.__dianaComposition?.progress ?? 0)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  if (testInfo.project.name === "mobile") {
    await page.getByLabel("Page sections", { exact: true }).click();
    await page.getByRole("link", { name: "Join the waitlist", exact: true }).click();
  } else {
    await page.getByRole("link", { name: "Join Waitlist", exact: true }).click();
  }
  await expect(page.getByRole("textbox", { name: "Email address", exact: true })).toBeVisible();
  await expect(page.locator(".dpl-honeypot")).toBeHidden();
  expect(errors).toEqual([]);
});

test("waitlist links remain public and reduced motion has a usable fallback", async ({ page }) => {
  await page.goto("/early-access/confirm");
  await expect(page.getByRole("heading", { name: "Confirm Early Access" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("We could not use this link");
  await page.goto("/early-access/unsubscribe");
  await expect(page.getByRole("heading", { name: "Early Access Preferences" })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your Day Starts Here", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Join the Waitlist", exact: true })).toBeVisible();
});

test("reading stops and both real videos stay framed until their holds finish", async ({ page }, testInfo) => {
  test.setTimeout(process.env.CI ? 360_000 : 180_000);
  await page.goto("/");
  await expect(page.locator("body")).toHaveClass(/motion-ready/);
  await expect(page.locator("#motion")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator("#motion")).toHaveCSS("clip-path", "none");
  await expect(page.locator(".vision-sequence")).toHaveCSS("color", "rgb(0, 0, 0)");
  await expect(page.locator(".questions-heading h2")).toHaveCSS("color", "rgb(0, 0, 0)");
  // Use the real chapter link to establish the same timeline offset as skipping the intro.
  await page.evaluate(() => (document.querySelector('a[href="#homework"]') as HTMLElement).click());
  await expect.poll(() => page.evaluate(() => (window as AnimatedWindow).__dianaComposition?.carousel)).toBe(1);
  const offset = await page.evaluate(() => (window as AnimatedWindow).__dianaComposition.timelinePixels - (window as AnimatedWindow).__dianaComposition.scrollPixels);
  const positionBefore = async (point: number) => {
    await page.evaluate(({point, offset}) => {
      (window as AnimatedWindow).__dianaComposition.seek(0);
      window.scrollTo({top: point - offset - 25, behavior: "instant"});
    }, {point, offset});
    await expect.poll(() => page.evaluate(() => (window as AnimatedWindow).__dianaComposition.timelinePixels)).toBeCloseTo(point - 25, 0);
    await page.evaluate(() => (window as AnimatedWindow).__dianaComposition.play());
  };
  const stops = await page.evaluate(() => (window as AnimatedWindow).__dianaComposition.readingStops);
  for (const stop of stops.filter((item: {id: string}) => item.id.startsWith("vision"))) {
    await positionBefore(stop.point);
    // Record at the rendered hold, not after several slow remote-browser round trips.
    const observedHold = page.evaluate(id => new Promise<{timeline: number; opacity: string; transform: string; blocked: boolean}>(resolve => {
      const observe = (event: Event) => {
        const composition = (window as AnimatedWindow).__dianaComposition;
        if ((event as CustomEvent<{id: string}>).detail.id !== id) return;
        window.removeEventListener("diana:reading-hold", observe);
        const phrase = document.querySelectorAll(".vision-sequence > *")[Number(id.split("-")[1])];
        const style = getComputedStyle(phrase);
        const wheel = new WheelEvent("wheel", {deltaY: 1400, cancelable: true});
        window.dispatchEvent(wheel);
        resolve({timeline: composition.timelinePixels, opacity: style.opacity, transform: style.transform, blocked: wheel.defaultPrevented});
      };
      window.addEventListener("diana:reading-hold", observe);
    }), stop.id);
    await page.mouse.wheel(0, 600);
    const held = await observedHold;
    expect(held.timeline).toBeCloseTo(stop.point, 0);
    expect(held.opacity).toBe("1");
    expect(held.transform).toBe("matrix(1, 0, 0, 1, 0, 0)");
    expect(held.blocked).toBe(true);
    if (stop.id === "vision-0") await page.screenshot({path: testInfo.outputPath("chatbot-reading-hold.png")});
    await expect.poll(() => page.evaluate(() => (window as AnimatedWindow).__dianaComposition.readingHold)).toBeNull();
  }
  const playbackStops = await page.evaluate(() => (window as AnimatedWindow).__dianaComposition.dayPlaybackStops);
  for (const index of [1, 2]) {
    await positionBefore(playbackStops[index]!);
    // Pause on the first playing frame inside the browser. A wheel command can
    // take longer than the entire clip to acknowledge on a software GPU.
    const pausedFrame = page.evaluate(index => new Promise<void>(resolve => {
      const observe = () => {
        const composition = (window as AnimatedWindow).__dianaComposition;
        const video = composition.videoPlayback[index];
        if (composition.videoLocked && video.currentTime > 0 && !video.finished) {
          (document.querySelector("#motion") as HTMLButtonElement).click();
          resolve();
        } else requestAnimationFrame(observe);
      };
      requestAnimationFrame(observe);
    }), index);
    await page.mouse.wheel(0, 900);
    await pausedFrame;
    await expect(page.getByRole("button", {name: "Play motion", exact: true})).toBeVisible();
    const fixed = await page.evaluate(() => ({y: scrollY, timeline: (window as AnimatedWindow).__dianaComposition.timelinePixels}));
    const video = await page.evaluate(index => (window as AnimatedWindow).__dianaComposition.videoPlayback[index], index);
    expect(video.paused).toBe(true);
    expect(video.finished).toBe(false);
    expect(video.currentTime).toBeGreaterThan(0);
    expect(Math.abs(video.angle)).toBeLessThan(.0001);
    expect(video.opacity).toBe(1);
    await expect(page.locator(".day-caption")).toHaveCSS("opacity", "1");
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => scrollY)).toBeCloseTo(fixed.y, 0);
    expect(await page.evaluate(() => (window as AnimatedWindow).__dianaComposition.timelinePixels)).toBeCloseTo(fixed.timeline, 0);
    const videoEvidence = testInfo.outputPath(`video-${index}-settled.png`);
    await page.screenshot({path: videoEvidence});
    await testInfo.attach(`video-${index}-settled`, {path: videoEvidence, contentType: "image/png"});
    // Observe every available playing frame locally, not after a slow protocol
    // round trip that may complete after the ended event releases the lock.
    const playbackFrames = page.evaluate(({index, fixed}) => new Promise<{samples: number; moved: boolean; blocked: boolean; framed: boolean}>(resolve => {
      const result = {samples: 0, moved: false, blocked: true, framed: true};
      const observe = () => {
        const composition = (window as AnimatedWindow).__dianaComposition;
        const video = composition.videoPlayback[index];
        if (video.finished) { resolve(result); return; }
        if (composition.videoLocked && !video.paused) {
          result.samples++;
          result.moved ||= Math.abs(scrollY - fixed.y) > 1 || Math.abs(composition.timelinePixels - fixed.timeline) > .5;
          result.framed &&= Math.abs(video.angle) < .0001 && video.opacity === 1 && getComputedStyle(document.querySelector(".day-caption")!).opacity === "1";
          const wheel = new WheelEvent("wheel", {deltaY: 3000, cancelable: true});
          window.dispatchEvent(wheel);
          result.blocked &&= wheel.defaultPrevented;
        }
        requestAnimationFrame(observe);
      };
      requestAnimationFrame(observe);
    }), {index, fixed});
    await page.getByRole("button", {name: "Play motion", exact: true}).click();
    const observed = await playbackFrames;
    expect(observed.samples).toBeGreaterThan(1);
    expect(observed.moved).toBe(false);
    expect(observed.blocked).toBe(true);
    expect(observed.framed).toBe(true);
    const completed = await page.evaluate(index => (window as AnimatedWindow).__dianaComposition.videoPlayback[index], index);
    expect(completed.currentTime).toBeGreaterThanOrEqual(completed.duration - .1);
    await expect.poll(() => page.evaluate(() => (window as AnimatedWindow).__dianaComposition.videoLocked)).toBe(false);
    await page.mouse.wheel(0, 250);
    await expect.poll(() => page.evaluate(() => (window as AnimatedWindow).__dianaComposition.dayIndex)).toBeGreaterThan(index);
    expect(await page.evaluate(() => (window as AnimatedWindow).__dianaComposition.dayIndex)).toBeLessThan(index + .2);
  }
  const titleStop = stops.find((item: {id: string}) => item.id === "control-title");
  await positionBefore(titleStop!.point);
  const observedTitle = page.evaluate(() => new Promise<string>(resolve => {
    const observe = (event: Event) => {
      if ((event as CustomEvent<{id: string}>).detail.id !== "control-title") return;
      window.removeEventListener("diana:reading-hold", observe);
      resolve(getComputedStyle(document.querySelector(".hero .control-title")!).opacity);
    };
    window.addEventListener("diana:reading-hold", observe);
  }));
  await page.mouse.wheel(0, 500);
  expect(await observedTitle).toBe("1");
  await page.screenshot({path: testInfo.outputPath("control-title-hold.png")});
  await expect.poll(() => page.evaluate(() => (window as AnimatedWindow).__dianaComposition.readingHold)).toBeNull();
  expect(await page.locator(".hero .control-atmosphere").evaluate(element => getComputedStyle(element, "::before").content)).toBe("none");
  expect(await page.locator(".hero .control-atmosphere i").first().evaluate(element => getComputedStyle(element).maskImage)).toContain("symbol.svg");
  await page.evaluate(() => { (window as AnimatedWindow).__dianaComposition.seek(0); window.scrollTo({top: (window as AnimatedWindow).__dianaComposition.nativeEnd, behavior: "instant"}); });
  await expect.poll(() => page.locator(".questions").evaluate(element => Math.round(element.getBoundingClientRect().top))).toBe(await page.evaluate(() => innerHeight));
  await page.mouse.wheel(0, 600);
  await expect(page.getByRole("heading", {name: "Good Questions", exact: true})).toBeInViewport();
});

test("switching to reduced motion during a video releases scrolling", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toHaveClass(/motion-ready/);
  await page.evaluate(() => (document.querySelector('a[href="#homework"]') as HTMLElement).click());
  await expect.poll(() => page.evaluate(() => (window as AnimatedWindow).__dianaComposition?.carousel)).toBe(1);
  await page.evaluate(() => {
    const composition = (window as AnimatedWindow).__dianaComposition;
    const offset = composition.timelinePixels - composition.scrollPixels;
    composition.seek(0);
    window.scrollTo({top: composition.dayPlaybackStops[1]! - offset - 25, behavior: "instant"});
  });
  await expect.poll(() => page.evaluate(() => {
    const composition = (window as AnimatedWindow).__dianaComposition;
    return Math.abs(composition.timelinePixels - (composition.dayPlaybackStops[1]! - 25));
  })).toBeLessThan(1);
  await page.evaluate(() => (window as AnimatedWindow).__dianaComposition.play());
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => (window as AnimatedWindow).__dianaComposition.videoLocked)).toBe(true);
  await page.emulateMedia({reducedMotion: "reduce"});
  await expect(page.locator("body")).not.toHaveClass(/motion-ready/);
  await expect.poll(() => page.evaluate(() => (window as AnimatedWindow).__dianaComposition.videoLocked)).toBe(false);
  await page.evaluate(() => window.scrollTo({top: 0, behavior: "instant"}));
  await page.mouse.wheel(0, 500);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
});
