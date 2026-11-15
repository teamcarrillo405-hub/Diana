"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

import type { CadPrimitiveMesh, ValidatedCadModel } from "@/lib/native-tools/cad";
import { activeRuntimeState } from "@/lib/specialist-artifacts/active-state";
import type { SpecialistActiveRuntimeState } from "@/lib/specialist-artifacts/contracts";

type ViewerSource =
  | { kind: "model"; value: ValidatedCadModel }
  | { kind: "primitive"; value: CadPrimitiveMesh };

type ViewerProps = {
  label: string;
  source: ViewerSource;
  onRuntimeStateChange?: (state: SpecialistActiveRuntimeState) => void;
};

async function objectForModel(model: ValidatedCadModel): Promise<THREE.Object3D> {
  if (model.extension === "stl") {
    if (!(model.payload instanceof ArrayBuffer)) throw new TypeError("The validated STL payload is unavailable.");
    const geometry = new STLLoader().parse(model.payload);
    geometry.computeVertexNormals();
    return new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: 0x74c0ff, roughness: 0.62, metalness: 0.08 }),
    );
  }
  if (model.extension === "obj") {
    if (typeof model.payload !== "string") throw new TypeError("The validated OBJ payload is unavailable.");
    return new OBJLoader().parse(model.payload);
  }
  const payload = model.payload;
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(payload, "", (gltf) => resolve(gltf.scene), reject);
  });
}

function objectForPrimitive(mesh: CadPrimitiveMesh): THREE.Object3D {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(mesh.positions, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.58, metalness: 0.06 }),
  );
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material.dispose());
  });
}

function BoundedCadViewer({ label, source, onRuntimeStateChange }: ViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("Loading the bounded 3D preview...");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const engines = source.kind === "primitive"
      ? ["Three.js", "JSCAD"]
      : ["Three.js", `${source.value.extension.toUpperCase()} loader`];
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "low-power" });
    } catch {
      const state = activeRuntimeState(
        "unavailable",
        engines,
        "WebGL is not available. Dimensions, constraints, and validated model metadata remain saved.",
      );
      onRuntimeStateChange?.(state);
      setMessage(state.detail ?? "3D preview unavailable.");
      return;
    }

    let disposed = false;
    let frame = 0;
    let model: THREE.Object3D | null = null;
    onRuntimeStateChange?.(activeRuntimeState("loading", engines));
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    const camera = new THREE.PerspectiveCamera(40, 2, 0.01, 10_000);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.replaceChildren(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x64748b, 2.4));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 7, 5);
    scene.add(key);
    scene.add(new THREE.GridHelper(10, 20, 0x94a3b8, 0xdbeafe));

    let dragging = false;
    let priorX = 0;
    let priorY = 0;
    const pointerDown = (event: PointerEvent) => {
      dragging = true;
      priorX = event.clientX;
      priorY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      if (!dragging || !model) return;
      model.rotation.y += (event.clientX - priorX) * 0.01;
      model.rotation.x += (event.clientY - priorY) * 0.01;
      priorX = event.clientX;
      priorY = event.clientY;
    };
    const pointerUp = () => { dragging = false; };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      camera.position.multiplyScalar(event.deltaY > 0 ? 1.08 : 0.92);
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("pointercancel", pointerUp);
    renderer.domElement.addEventListener("wheel", wheel, { passive: false });

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(240, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const load = source.kind === "model"
      ? objectForModel(source.value)
      : Promise.resolve(objectForPrimitive(source.value));
    void load.then((loaded) => {
      if (disposed) {
        disposeObject(loaded);
        return;
      }
      const bounds = new THREE.Box3().setFromObject(loaded);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      if (!Number.isFinite(size.x + size.y + size.z) || bounds.isEmpty()) {
        disposeObject(loaded);
        throw new TypeError("The model has no finite preview bounds.");
      }
      model = loaded;
      loaded.position.sub(center);
      const largest = Math.max(size.x, size.y, size.z, 0.1);
      loaded.scale.setScalar(4 / largest);
      scene.add(loaded);
      camera.position.set(5, 4, 6);
      camera.lookAt(0, 0, 0);
      const state = activeRuntimeState(
        "ready",
        engines,
        "Bounded 3D viewing is ready. Drag to rotate and use the mouse wheel to zoom.",
      );
      onRuntimeStateChange?.(state);
      setMessage(state.detail ?? "3D preview ready.");
    }).catch(() => {
      if (disposed) return;
      const state = activeRuntimeState(
        "limited",
        engines,
        "This validated model could not be drawn. Dimensions, constraints, and typed or ink work remain available.",
      );
      onRuntimeStateChange?.(state);
      setMessage(state.detail ?? "3D preview limited.");
    });

    const render = () => {
      frame = requestAnimationFrame(render);
      renderer.render(scene, camera);
    };
    render();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("pointercancel", pointerUp);
      renderer.domElement.removeEventListener("wheel", wheel);
      if (model) disposeObject(model);
      renderer.dispose();
      host.replaceChildren();
    };
  }, [onRuntimeStateChange, source.kind, source.value]);

  return (
    <div>
      <div ref={hostRef} className="mt-3 h-[320px] w-full overflow-hidden border border-slate-300 bg-slate-50" role="img" aria-label={label} />
      <p className="mb-0 mt-2 text-sm text-slate-700" aria-live="polite">{message}</p>
    </div>
  );
}

export function CadModelViewer({ model, onRuntimeStateChange }: {
  model: ValidatedCadModel;
  onRuntimeStateChange?: (state: SpecialistActiveRuntimeState) => void;
}) {
  return <BoundedCadViewer label={`3D preview of ${model.fileName}`} source={{ kind: "model", value: model }} onRuntimeStateChange={onRuntimeStateChange} />;
}

export function CadPrimitiveViewer({ mesh, onRuntimeStateChange }: {
  mesh: CadPrimitiveMesh;
  onRuntimeStateChange?: (state: SpecialistActiveRuntimeState) => void;
}) {
  return <BoundedCadViewer label={`3D preview of bounded ${mesh.primitive}`} source={{ kind: "primitive", value: mesh }} onRuntimeStateChange={onRuntimeStateChange} />;
}
