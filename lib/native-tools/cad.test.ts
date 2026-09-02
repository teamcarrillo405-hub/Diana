import { describe, expect, it } from "vitest";

import {
  cadExtension,
  createCadPrimitive,
  validateCadModelPayload,
  validateDimensionedSketch,
} from "./cad";

describe("CAD foundation", () => {
  it("accepts only the initial safe viewer formats", () => {
    expect(cadExtension("prototype.STL")).toBe("stl");
    expect(cadExtension("assembly.glb")).toBe("glb");
    expect(cadExtension("machine.exe")).toBeNull();
    expect(cadExtension("part.step")).toBeNull();
  });

  it("requires dimensions and design constraints", () => {
    expect(validateDimensionedSketch({
      units: "mm",
      width: 0,
      height: 20,
      depth: -1,
      constraints: [],
    })).toEqual([
      "Add a positive width.",
      "Depth must be positive when used.",
      "Record at least one design constraint.",
    ]);
  });

  it("builds only controlled JSCAD primitives", () => {
    const result = createCadPrimitive({
      primitive: "box",
      width: 10,
      height: 20,
      depth: 30,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      primitive: "box",
      dimensions: { width: 10, height: 20, depth: 30 },
      volume: 6_000,
      polygonCount: 6,
      triangleCount: 12,
    });
    expect(result.value.positions).toHaveLength(108);
  });

  it("validates model structure before Three.js receives it", () => {
    const encode = (value: string): ArrayBuffer => {
      const source = new TextEncoder().encode(value);
      const buffer = new ArrayBuffer(source.byteLength);
      new Uint8Array(buffer).set(source);
      return buffer;
    };
    const validObj = encode([
      "v 0 0 0",
      "v 1 0 0",
      "v 0 1 0",
      "f 1 2 3",
    ].join("\n"));
    const externalObj = encode([
      "mtllib remote.mtl",
      "v 0 0 0",
      "v 1 0 0",
      "v 0 1 0",
      "f 1 2 3",
    ].join("\n"));

    expect(validateCadModelPayload("shape.obj", validObj)).toMatchObject({
      ok: true,
      value: { triangleCount: 1, vertexCount: 3 },
    });
    expect(validateCadModelPayload("shape.obj", externalObj)).toMatchObject({ ok: false });
    expect(validateCadModelPayload("shape.step", validObj)).toMatchObject({ ok: false });
  });
});
