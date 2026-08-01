"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

import type { CadViewExtension } from "@/lib/native-tools/cad";

type Props = {
  file: File;
  extension: CadViewExtension;
};

async function modelForFile(file: File, extension: CadViewExtension): Promise<THREE.Object3D> {
  if (extension === "stl") {
    const geometry = new STLLoader().parse(await file.arrayBuffer());
    geometry.computeVertexNormals();
    return new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: 0x74c0ff, roughness: 0.62, metalness: 0.08 }),
    );
  }
  if (extension === "obj") {
    return new OBJLoader().parse(await file.text());
  }
  const payload = extension === "gltf" ? await file.text() : await file.arrayBuffer();
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(payload, "", (gltf) => resolve(gltf.scene), reject);
  });
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material.dispose());
  });
}

export function CadModelViewer({ file, extension }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("Loading model...");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let frame = 0;
    let model: THREE.Object3D | null = null;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    const camera = new THREE.PerspectiveCamera(40, 2, 0.01, 10_000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
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

    void modelForFile(file, extension).then((loaded) => {
      if (disposed) {
        disposeObject(loaded);
        return;
      }
      model = loaded;
      const bounds = new THREE.Box3().setFromObject(loaded);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      loaded.position.sub(center);
      const largest = Math.max(size.x, size.y, size.z, 0.1);
      loaded.scale.setScalar(4 / largest);
      scene.add(loaded);
      camera.position.set(5, 4, 6);
      camera.lookAt(0, 0, 0);
      setMessage("Drag to rotate. Use the mouse wheel to zoom.");
    }).catch(() => setMessage("This model could not be previewed. Keep the original file for teacher review."));

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
      renderer.domElement.removeEventListener("wheel", wheel);
      if (model) disposeObject(model);
      renderer.dispose();
      host.replaceChildren();
    };
  }, [extension, file]);

  return (
    <div>
      <div ref={hostRef} className="mt-3 h-[320px] w-full overflow-hidden border border-slate-300 bg-slate-50" role="img" aria-label={`3D preview of ${file.name}`} />
      <p className="mb-0 mt-2 text-sm text-slate-700" aria-live="polite">{message}</p>
    </div>
  );
}
