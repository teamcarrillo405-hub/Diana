import { describe, expect, it } from "vitest";
import { subjectArtwork } from "./assignment-navigation";

describe("subjectArtwork", () => {
  it("uses a neutral classroom for an unrecognized subject instead of a Diana portrait", () => {
    expect(subjectArtwork("Legal research")).toBe("/assets/work/college-classroom-1920.webp");
    expect(subjectArtwork("")).toBe("/assets/work/college-classroom-1920.webp");
  });
  it("keeps recognized math and science artwork, including statistics", () => {
    expect(subjectArtwork("AP Statistics")).toBe("/assets/landing-10k/subjects/math.webp");
    expect(subjectArtwork("Calculus III")).toBe("/assets/landing-10k/subjects/math.webp");
    expect(subjectArtwork("Chemistry")).toBe("/assets/landing-10k/subjects/chemistry.webp");
    expect(subjectArtwork("Physics")).toBe("/assets/landing-10k/subjects/physics.webp");
  });
});
