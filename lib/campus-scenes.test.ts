import { describe, expect, it } from "vitest";
import { campusSceneStyle } from "./campus-scenes";

describe("campus scene intent", () => {
  it("supports a plain paper surface without choosing a room from navigation", () => {
    expect(campusSceneStyle("none")).toEqual({ "--campus-scene-image": "none" });
    expect(campusSceneStyle("library")).toEqual({ "--campus-scene-image": "var(--campus-library-image)" });
  });
});
