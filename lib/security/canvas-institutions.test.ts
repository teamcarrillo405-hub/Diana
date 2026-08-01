import { afterEach, describe, expect, it } from "vitest";
import {
  resolveCanvasConnectionDestination,
  resolveCanvasInstitutionById,
  resolveCanvasInstitutionFromRequest,
} from "./canvas-institutions";

const originalRegistry = process.env.CANVAS_INSTITUTIONS_JSON;
const originalAllowlist = process.env.CANVAS_ALLOWED_ORIGINS;

afterEach(() => {
  if (originalRegistry === undefined) delete process.env.CANVAS_INSTITUTIONS_JSON;
  else process.env.CANVAS_INSTITUTIONS_JSON = originalRegistry;
  if (originalAllowlist === undefined) delete process.env.CANVAS_ALLOWED_ORIGINS;
  else process.env.CANVAS_ALLOWED_ORIGINS = originalAllowlist;
});

describe("Canvas institution registry", () => {
  it("turns a request URL into a server-configured institution", async () => {
    process.env.CANVAS_INSTITUTIONS_JSON = JSON.stringify({
      lincoln: { origin: "https://93.184.216.34" },
    });
    delete process.env.CANVAS_ALLOWED_ORIGINS;

    await expect(resolveCanvasInstitutionFromRequest("https://93.184.216.34/courses/123")).resolves.toEqual({
      id: "lincoln",
      origin: "https://93.184.216.34",
    });
  });

  it("rejects attacker lookalikes that are absent from the exact registry", async () => {
    process.env.CANVAS_INSTITUTIONS_JSON = JSON.stringify({
      school: "https://canvas.school.example",
    });
    delete process.env.CANVAS_ALLOWED_ORIGINS;

    await expect(
      resolveCanvasInstitutionFromRequest("https://canvas.school.example.attacker.test"),
    ).rejects.toThrow("not configured");
  });

  it("resolves callback destinations by server-issued institution ID", async () => {
    process.env.CANVAS_INSTITUTIONS_JSON = JSON.stringify({
      school: "https://93.184.216.34",
    });
    delete process.env.CANVAS_ALLOWED_ORIGINS;

    await expect(resolveCanvasInstitutionById("school")).resolves.toEqual({
      id: "school",
      origin: "https://93.184.216.34",
    });
    await expect(resolveCanvasInstitutionById("attacker-choice")).rejects.toThrow("not configured");
  });

  it("rejects saved base URLs that conflict with their institution ID", async () => {
    process.env.CANVAS_INSTITUTIONS_JSON = JSON.stringify({
      school: "https://93.184.216.34",
    });
    delete process.env.CANVAS_ALLOWED_ORIGINS;

    await expect(resolveCanvasConnectionDestination({
      institution_id: "school",
      base_url: "https://93.184.216.35",
    })).rejects.toThrow("does not match");
  });
});
