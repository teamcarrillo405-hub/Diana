import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DianaIdleCharacter } from "./diana-idle-character";
import { TodayDesignPreview, type TodayCharacterAssets } from "./today-design-preview";
import sceneAssets from "./diana-scene-assets.json";
import signatureBackground from "../today-now-assets/diana-signature-background.json";

vi.mock("./diana-idle-character", () => ({ DianaIdleCharacter: vi.fn(() => null) }));

beforeEach(() => vi.clearAllMocks());

describe("asset-review configuration", () => {
  it("uses the Diana environment in both responsive sources without changing character assets", () => {
    const review = renderToStaticMarkup(<TodayDesignPreview motionReview compositionReview assetsReview backgroundAssets={signatureBackground} />);
    expect(review).toContain(signatureBackground.src);
    expect(review).toContain(signatureBackground.srcSet);
    expect(review).toContain(signatureBackground.mobileSrcSet);
    expect(review).not.toContain(sceneAssets.background.src);
    expect(review).not.toContain("data-work-segments");
    expect(review).toContain("data-now-queue-emblem");
    for (const [value] of vi.mocked(DianaIdleCharacter).mock.calls) {
      expect(value.assets?.motion).toBe(sceneAssets.motion.src);
      expect(value.assets?.poster).toBe(sceneAssets.matchingPoster.src);
    }
  });

  it("does not leak the background override outside asset review", () => {
    const prior = renderToStaticMarkup(<TodayDesignPreview motionReview compositionReview backgroundAssets={signatureBackground} />);
    expect(prior).not.toContain(signatureBackground.src);
    expect(prior).not.toContain("--today-scene-image:");
    expect(prior).not.toContain("data-work-segments");
    expect(prior).not.toContain("data-now-queue-emblem");
  });

  it("uses the native-resolution scene background only in the asset review", () => {
    const review = renderToStaticMarkup(<TodayDesignPreview motionReview compositionReview assetsReview />);
    expect(review).toContain("--today-scene-image:");
    expect(review).toContain(sceneAssets.background.src);
    const prior = renderToStaticMarkup(<TodayDesignPreview motionReview compositionReview />);
    expect(prior).not.toContain("--today-scene-image:");
    expect(prior).not.toContain(sceneAssets.background.src);
  });

  it("exposes the versioned background density choices without changing the character", () => {
    const review = renderToStaticMarkup(<TodayDesignPreview motionReview compositionReview assetsReview />);
    expect(review).toContain(`<source media="(max-width: 760px)" srcSet="${sceneAssets.background.mobileSrcSet}" sizes="100vw"`);
    expect(review).toContain(`<source srcSet="${sceneAssets.background.srcSet}" sizes="(max-width: 900px) max(100vw, calc(177.778svh - 117.333px)), max(100vw, 1736px)"`);
    expect(sceneAssets.background.width).toBeGreaterThan(0);
    expect(sceneAssets.background.height).toBeGreaterThan(0);
    expect(sceneAssets.background.srcSet).toContain(`${sceneAssets.background.width}w`);
  });

  it("wires the matching poster and motion pose to both screen sizes", () => {
    renderToStaticMarkup(<TodayDesignPreview motionReview compositionReview assetsReview />);
    const props = vi.mocked(DianaIdleCharacter).mock.calls.map(([value]) => value);
    expect(props).toHaveLength(2);
    expect(props.some(value => value.mobile)).toBe(true);
    expect(props.some(value => !value.mobile)).toBe(true);
    for (const value of props) {
      expect(value.enabled).toBe(true);
      expect(value.displayGrade).toBeUndefined();
      expect(value.assets).toEqual({
        poster: sceneAssets.matchingPoster.src,
        motion: sceneAssets.motion.src,
        posterPose: "motion",
        pixelWidth: sceneAssets.motion.width,
        pixelHeight: sceneAssets.motion.height,
      });
    }
  });

  it("injects the opt-in candidate for both sizes, with grade separate from assets", () => {
    const characterAssets: TodayCharacterAssets = {
      poster: "/landing-3d/today-now-assets/relit-media?asset=poster",
      motion: "/landing-3d/today-now-assets/relit-media?asset=motion",
      posterPose: "relit",
      motionPose: "relit",
      pixelWidth: 752,
      pixelHeight: 1920,
      displayGrade: "none",
    };
    const review = renderToStaticMarkup(<TodayDesignPreview motionReview compositionReview assetsReview characterAssets={characterAssets} />);
    const props = vi.mocked(DianaIdleCharacter).mock.calls.map(([value]) => value);
    expect(props).toHaveLength(2);
    expect(props.some(value => value.mobile)).toBe(true);
    expect(props.some(value => !value.mobile)).toBe(true);
    const { displayGrade, ...assets } = characterAssets;
    for (const value of props) {
      expect(value.assets).toEqual(assets);
      expect(value.assets).not.toHaveProperty("displayGrade");
      expect(value.displayGrade).toBe(displayGrade);
      expect(value.floorMaterial).toBe("satin");
      expect(value.enabled).toBe(true);
    }
    expect(review).toContain(sceneAssets.background.src);
    expect(review).toContain(sceneAssets.background.mobileSrcSet);
  });

  it("ignores a candidate override outside the isolated assets review", () => {
    renderToStaticMarkup(<TodayDesignPreview motionReview compositionReview characterAssets={{ poster: "/candidate.webp", motion: "/candidate.webm", posterPose: "relit", motionPose: "relit", displayGrade: "none" }} />);
    for (const [value] of vi.mocked(DianaIdleCharacter).mock.calls) {
      expect(value.assets).toBeUndefined();
      expect(value.displayGrade).toBeUndefined();
      expect(value.floorMaterial).toBe("atrium");
    }
  });

  it.each([false, true])("leaves the prior motion/composition review assets unchanged (composition=%s)", compositionReview => {
    renderToStaticMarkup(<TodayDesignPreview motionReview compositionReview={compositionReview} />);
    const props = vi.mocked(DianaIdleCharacter).mock.calls.map(([value]) => value);
    expect(props).toHaveLength(2);
    for (const value of props) expect(value.assets).toBeUndefined();
  });
});
