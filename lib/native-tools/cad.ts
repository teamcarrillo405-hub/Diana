import { geometries, measurements, primitives } from "@jscad/modeling";

export const CAD_VIEW_EXTENSIONS = ["stl", "obj", "gltf", "glb"] as const;
export type CadViewExtension = (typeof CAD_VIEW_EXTENSIONS)[number];

export const MAX_CAD_MODEL_BYTES = 8_000_000;
export const MAX_CAD_TRIANGLES = 100_000;
export const MAX_CAD_VERTICES = 300_000;
export const MAX_CAD_NODES = 1_000;
export const MAX_CAD_DIMENSION = 10_000;

export type DimensionedSketch = {
  units: "mm" | "cm" | "in" | "m";
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

export type ValidatedCadModel = {
  fileName: string;
  extension: CadViewExtension;
  byteLength: number;
  triangleCount: number | null;
  vertexCount: number | null;
  payload: string | ArrayBuffer;
};

export type CadModelValidationResult =
  | { ok: true; value: ValidatedCadModel }
  | { ok: false; error: string };

export type CadPrimitiveInput =
  | { primitive: "box"; width: number; height: number; depth: number }
  | { primitive: "cylinder"; radius: number; height: number; segments?: number };

export type CadPrimitiveMesh = {
  primitive: CadPrimitiveInput["primitive"];
  positions: number[];
  dimensions: { width: number; height: number; depth: number };
  volume: number;
  polygonCount: number;
  triangleCount: number;
};

export type CadPrimitiveResult =
  | { ok: true; value: CadPrimitiveMesh }
  | { ok: false; error: string };

function safeFileName(fileName: string): string {
  return fileName.split(/[\\/]/u).at(-1)?.slice(0, 160) || "student-model";
}

function decodeText(payload: ArrayBuffer): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(payload);
}

function binaryStlTriangleCount(payload: ArrayBuffer): number | null {
  if (payload.byteLength < 84) return null;
  const count = new DataView(payload).getUint32(80, true);
  return 84 + count * 50 === payload.byteLength ? count : null;
}

function validateStl(payload: ArrayBuffer): { triangleCount: number; vertexCount: number } {
  const binaryTriangles = binaryStlTriangleCount(payload);
  const triangleCount = binaryTriangles ?? (() => {
    const text = decodeText(payload);
    if (!/^\s*solid(?:\s|$)/iu.test(text) || !/\sendsolid\s*$/iu.test(text)) {
      throw new TypeError("This STL file is not a supported binary or ASCII model.");
    }
    return (text.match(/^\s*facet\s+normal\b/gimu) ?? []).length;
  })();
  if (triangleCount === 0) throw new TypeError("The STL model does not contain triangles.");
  if (triangleCount > MAX_CAD_TRIANGLES) {
    throw new RangeError(`Keep CAD previews under ${MAX_CAD_TRIANGLES.toLocaleString()} triangles.`);
  }
  return { triangleCount, vertexCount: triangleCount * 3 };
}

function validateObj(payload: ArrayBuffer): { triangleCount: number; vertexCount: number; text: string } {
  const text = decodeText(payload);
  if (/^\s*mtllib\s+/imu.test(text)) {
    throw new TypeError("OBJ previews must be self-contained and cannot reference material files.");
  }
  let vertexCount = 0;
  let triangleCount = 0;
  let lineCount = 0;
  for (const line of text.split(/\r?\n/u)) {
    lineCount += 1;
    if (lineCount > 500_000 || line.length > 16_384) {
      throw new RangeError("This OBJ file is too complex for the beta viewer.");
    }
    if (/^\s*v\s+/u.test(line)) vertexCount += 1;
    if (/^\s*f\s+/u.test(line)) {
      const points = line.trim().split(/\s+/u).slice(1);
      if (points.length < 3 || points.some((point) => !/^-?\d+(?:\/-?\d*){0,2}$/u.test(point))) {
        throw new TypeError("The OBJ file contains an unsupported face definition.");
      }
      triangleCount += points.length - 2;
    }
    if (vertexCount > MAX_CAD_VERTICES || triangleCount > MAX_CAD_TRIANGLES) {
      throw new RangeError("This OBJ file exceeds the beta viewer geometry limits.");
    }
  }
  if (vertexCount === 0 || triangleCount === 0) {
    throw new TypeError("The OBJ model needs vertices and faces.");
  }
  return { triangleCount, vertexCount, text };
}

function embeddedUri(value: unknown): boolean {
  return typeof value !== "string" || /^data:[a-z0-9.+/-]+(?:;base64)?,/iu.test(value);
}

function validateGltfDocument(value: unknown): { triangleCount: number | null; vertexCount: number } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("The glTF document is not valid JSON.");
  }
  const document = value as Record<string, unknown>;
  const asset = document.asset && typeof document.asset === "object" && !Array.isArray(document.asset)
    ? document.asset as Record<string, unknown>
    : {};
  if (typeof asset.version !== "string" || !asset.version.startsWith("2")) {
    throw new TypeError("The beta viewer supports glTF 2 models.");
  }
  const buffers = Array.isArray(document.buffers) ? document.buffers : [];
  const images = Array.isArray(document.images) ? document.images : [];
  for (const resource of [...buffers, ...images]) {
    if (!resource || typeof resource !== "object" || Array.isArray(resource)) continue;
    if (!embeddedUri((resource as Record<string, unknown>).uri)) {
      throw new TypeError("glTF previews must embed buffers and images; external URLs and files are disabled.");
    }
  }
  const allowedExtensions = new Set([
    "KHR_materials_unlit",
    "KHR_mesh_quantization",
    "KHR_texture_transform",
  ]);
  const required = Array.isArray(document.extensionsRequired) ? document.extensionsRequired : [];
  if (required.some((extension) => typeof extension !== "string" || !allowedExtensions.has(extension))) {
    throw new TypeError("This glTF model requires an extension that is not enabled in the beta viewer.");
  }
  const nodes = Array.isArray(document.nodes) ? document.nodes : [];
  const meshes = Array.isArray(document.meshes) ? document.meshes : [];
  const accessors = Array.isArray(document.accessors) ? document.accessors : [];
  if (nodes.length > MAX_CAD_NODES || meshes.length > 500 || accessors.length > 5_000) {
    throw new RangeError("This glTF model exceeds the beta viewer structure limits.");
  }
  let vertexCount = 0;
  let triangleCount = 0;
  let primitiveCount = 0;
  for (const rawMesh of meshes) {
    const mesh = rawMesh && typeof rawMesh === "object" && !Array.isArray(rawMesh)
      ? rawMesh as Record<string, unknown>
      : {};
    const meshPrimitives = Array.isArray(mesh.primitives) ? mesh.primitives : [];
    for (const rawPrimitive of meshPrimitives) {
      primitiveCount += 1;
      const primitive = rawPrimitive && typeof rawPrimitive === "object" && !Array.isArray(rawPrimitive)
        ? rawPrimitive as Record<string, unknown>
        : {};
      const attributes = primitive.attributes && typeof primitive.attributes === "object" && !Array.isArray(primitive.attributes)
        ? primitive.attributes as Record<string, unknown>
        : {};
      const positionIndex = Number(attributes.POSITION);
      const positionAccessor = Number.isInteger(positionIndex) && accessors[positionIndex] && typeof accessors[positionIndex] === "object"
        ? accessors[positionIndex] as Record<string, unknown>
        : null;
      const positions = Number(positionAccessor?.count);
      if (!Number.isSafeInteger(positions) || positions < 0) {
        throw new TypeError("A glTF mesh has an invalid position accessor.");
      }
      vertexCount += positions;
      const indexAccessorIndex = Number(primitive.indices);
      const indexAccessor = Number.isInteger(indexAccessorIndex) && accessors[indexAccessorIndex] && typeof accessors[indexAccessorIndex] === "object"
        ? accessors[indexAccessorIndex] as Record<string, unknown>
        : null;
      const mode = primitive.mode === undefined ? 4 : Number(primitive.mode);
      if (mode === 4) {
        const indexCount = Number(indexAccessor?.count);
        triangleCount += Number.isSafeInteger(indexCount) && indexCount >= 0
          ? Math.floor(indexCount / 3)
          : Math.floor(positions / 3);
      }
    }
  }
  if (primitiveCount === 0 || vertexCount === 0) {
    throw new TypeError("The glTF model does not contain previewable mesh geometry.");
  }
  if (primitiveCount > 5_000 || vertexCount > MAX_CAD_VERTICES || triangleCount > MAX_CAD_TRIANGLES) {
    throw new RangeError("This glTF model exceeds the beta viewer geometry limits.");
  }
  return { vertexCount, triangleCount: triangleCount || null };
}

function glbJson(payload: ArrayBuffer): unknown {
  if (payload.byteLength < 20) throw new TypeError("The GLB file is incomplete.");
  const view = new DataView(payload);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== payload.byteLength) {
    throw new TypeError("The GLB header is not valid glTF 2 data.");
  }
  const chunkLength = view.getUint32(12, true);
  const chunkType = view.getUint32(16, true);
  if (chunkType !== 0x4e4f534a || 20 + chunkLength > payload.byteLength) {
    throw new TypeError("The GLB file does not start with a valid JSON chunk.");
  }
  const json = new TextDecoder("utf-8", { fatal: true })
    .decode(new Uint8Array(payload, 20, chunkLength))
    .replace(/\u0000+$/u, "")
    .trim();
  return JSON.parse(json) as unknown;
}

export function validateCadModelPayload(
  fileName: string,
  payload: ArrayBuffer,
): CadModelValidationResult {
  const extension = cadExtension(fileName);
  if (!extension) return { ok: false, error: "Choose an STL, OBJ, glTF, or GLB model." };
  if (payload.byteLength === 0 || payload.byteLength > MAX_CAD_MODEL_BYTES) {
    return { ok: false, error: "Keep CAD previews between 1 byte and 8 MB." };
  }
  try {
    let triangleCount: number | null;
    let vertexCount: number | null;
    let viewerPayload: string | ArrayBuffer = payload;
    if (extension === "stl") {
      ({ triangleCount, vertexCount } = validateStl(payload));
    } else if (extension === "obj") {
      const inspected = validateObj(payload);
      triangleCount = inspected.triangleCount;
      vertexCount = inspected.vertexCount;
      viewerPayload = inspected.text;
    } else if (extension === "gltf") {
      const text = decodeText(payload);
      ({ triangleCount, vertexCount } = validateGltfDocument(JSON.parse(text) as unknown));
      viewerPayload = text;
    } else {
      ({ triangleCount, vertexCount } = validateGltfDocument(glbJson(payload)));
    }
    return {
      ok: true,
      value: {
        fileName: safeFileName(fileName),
        extension,
        byteLength: payload.byteLength,
        triangleCount,
        vertexCount,
        payload: viewerPayload,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "This CAD model could not be validated.",
    };
  }
}

export async function validateCadModelFile(file: File): Promise<CadModelValidationResult> {
  if (file.size > MAX_CAD_MODEL_BYTES) {
    return { ok: false, error: "Keep CAD previews under 8 MB." };
  }
  return validateCadModelPayload(file.name, await file.arrayBuffer());
}

function boundedDimension(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0 || value > MAX_CAD_DIMENSION) {
    throw new RangeError(`${label} must be greater than 0 and no more than ${MAX_CAD_DIMENSION.toLocaleString()}.`);
  }
  return Math.round(value * 1_000) / 1_000;
}

export function createCadPrimitive(input: CadPrimitiveInput): CadPrimitiveResult {
  try {
    const geometry = input.primitive === "box"
      ? primitives.cuboid({ size: [
          boundedDimension(input.width, "Width"),
          boundedDimension(input.height, "Height"),
          boundedDimension(input.depth, "Depth"),
        ] })
      : primitives.cylinder({
          radius: boundedDimension(input.radius, "Radius"),
          height: boundedDimension(input.height, "Height"),
          segments: Math.min(64, Math.max(12, Math.trunc(input.segments ?? 32))),
        });
    const polygons = geometries.geom3.toPolygons(geometry);
    const positions: number[] = [];
    let triangleCount = 0;
    for (const polygon of polygons) {
      const points = geometries.poly3.toPoints(polygon);
      for (let index = 1; index < points.length - 1; index += 1) {
        for (const point of [points[0]!, points[index]!, points[index + 1]!]) {
          positions.push(point[0], point[1], point[2]);
        }
        triangleCount += 1;
      }
    }
    const bounds = measurements.measureBoundingBox(geometry) as [[number, number, number], [number, number, number]];
    const dimensions = {
      width: Math.round((bounds[1][0] - bounds[0][0]) * 1_000) / 1_000,
      height: Math.round((bounds[1][1] - bounds[0][1]) * 1_000) / 1_000,
      depth: Math.round((bounds[1][2] - bounds[0][2]) * 1_000) / 1_000,
    };
    return {
      ok: true,
      value: {
        primitive: input.primitive,
        positions,
        dimensions,
        volume: Math.round(measurements.measureVolume(geometry) * 1_000) / 1_000,
        polygonCount: polygons.length,
        triangleCount,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "This bounded CAD primitive could not be created.",
    };
  }
}
