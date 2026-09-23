export const CAD_VIEW_EXTENSIONS = ["stl", "obj", "gltf", "glb"] as const;
export type CadViewExtension = (typeof CAD_VIEW_EXTENSIONS)[number];

export type DimensionedSketch = {
  units: "mm" | "cm" | "in";
  width: number;
  height: number;
  depth: number | null;
  constraints: string[];
};

export function cadExtension(fileName: string): CadViewExtension | null {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return extension && CAD_VIEW_EXTENSIONS.includes(extension as CadViewExtension)
    ? extension as CadViewExtension
    : null;
}

export function validateDimensionedSketch(sketch: DimensionedSketch): string[] {
  return [
    !(sketch.width > 0) ? "Add a positive width." : "",
    !(sketch.height > 0) ? "Add a positive height." : "",
    sketch.depth !== null && !(sketch.depth > 0) ? "Depth must be positive when used." : "",
    sketch.constraints.length === 0 ? "Record at least one design constraint." : "",
  ].filter(Boolean);
}
