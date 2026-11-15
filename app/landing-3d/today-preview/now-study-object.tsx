"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { getStudySceneLayout } from "./study-scene-layout";

function coverTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 1024;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#18383c";
  context.fillRect(0, 0, 768, 1024);
  for (let index = 0; index < 12000; index++) {
    context.fillStyle = index % 2 ? "#ffffff04" : "#00000007";
    context.fillRect((index * 173) % 768, (index * 317) % 1024, 2, 1);
  }
  context.fillStyle = "#4de4ea";
  context.fillRect(52, 65, 6, 50);
  context.font = "500 30px Arial";
  context.fillText("HISTORY / RESEARCH", 82, 100);
  context.fillStyle = "#eef4f2";
  context.font = "bold 100px Arial";
  context.fillText("NIXON", 68, 296);
  context.font = "30px Arial";
  context.fillText("THE PRESIDENCY", 72, 351);
  context.strokeStyle = "#689398";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(72, 411);
  context.lineTo(696, 411);
  context.stroke();
  context.fillStyle = "#b9cdcc";
  context.font = "23px Arial";
  context.fillText("RESEARCH NOTES", 72, 820);
  context.fillText("SOURCES / ARGUMENT / DRAFT", 72, 864);
  context.fillStyle = "#50d6da";
  context.fillRect(72, 920, 84, 6);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function ResearchFolio() {
  const texture = useMemo(coverTexture, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <group position={[0, 1.55, 0]}>
    <RoundedBox args={[2.36, 3.1, .2]} radius={.035} smoothness={3} castShadow>
      <meshStandardMaterial color="#244b4d" roughness={.75} metalness={.06} />
    </RoundedBox>
    <RoundedBox args={[2.21, 2.97, .13]} position={[.035, 0, .14]} radius={.018} smoothness={2} castShadow>
      <meshStandardMaterial color="#f0f0e7" roughness={.85} />
    </RoundedBox>
    {[0, 1, 2, 3].map(index => <mesh key={index} position={[.04, -1.485, .095 + index * .035]}>
      <boxGeometry args={[2.14, .007, .005]} />
      <meshStandardMaterial color="#a9b6b1" />
    </mesh>)}
    <RoundedBox args={[2.36, 3.1, .055]} position={[0, 0, .24]} radius={.025} smoothness={3} castShadow>
      <meshStandardMaterial color="#24545b" roughness={.7} metalness={.1} />
    </RoundedBox>
    <mesh position={[0, 0, .271]}>
      <planeGeometry args={[2.29, 3.035]} />
      <meshStandardMaterial map={texture} roughness={.68} metalness={.08} />
    </mesh>
    <RoundedBox args={[.1, 3.05, .09]} position={[-1.06, 0, .29]} radius={.015} smoothness={2}>
      <meshStandardMaterial color="#111e23" roughness={.68} />
    </RoundedBox>
    <RoundedBox args={[.38, .18, .035]} position={[1.13, .86, .1]} radius={.018} smoothness={2}>
      <meshStandardMaterial color="#f4bd4c" roughness={.58} />
    </RoundedBox>
    <RoundedBox args={[.36, .18, .035]} position={[1.12, .58, .06]} radius={.018} smoothness={2}>
      <meshStandardMaterial color="#67e4c0" roughness={.58} />
    </RoundedBox>
  </group>;
}

function StudyWorkstation({ reducedMotion, compact }: { reducedMotion: boolean; compact: boolean }) {
  const width = useThree(state => state.viewport.width);
  const layout = getStudySceneLayout(width, compact);
  useFrame(({ camera, pointer }, delta) => {
    const x = reducedMotion ? 0 : pointer.x * .1;
    const y = reducedMotion ? 2.4 : 2.4 + pointer.y * .06;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, x, 5, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, y, 5, delta);
    camera.lookAt(0, 0, 0);
  });
  return <>
    <hemisphereLight args={["#f3fafb", "#667d7d", .75]} />
    <directionalLight position={[-3, 7, 5]} intensity={3.4} color="#fff6e9" />
    <directionalLight position={[5, 3, -1]} intensity={.6} color="#d6edec" />
    <Environment resolution={128} frames={1}>
      <Lightformer position={[-5, 5, 3]} rotation={[0, Math.PI / 3, 0]} scale={[5, 8, 1]} intensity={1} color="#ffffff" />
      <Lightformer position={[5, 2, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[3, 5, 1]} intensity={.7} color="#d4f0ed" />
    </Environment>
    <RoundedBox args={[30, .075, 4.1]} radius={.018} smoothness={3} position={[0, layout.surfaceY - .0375, -.85]} receiveShadow castShadow>
      <meshStandardMaterial color="#d4dedb" roughness={.64} metalness={.04} />
    </RoundedBox>
    {[-1, 1].map(side => <RoundedBox key={side} args={[.075, 2.2, .2]} radius={.018} smoothness={2} position={[layout.x + side * 1.25, layout.surfaceY - 1.175, .6]}>
      <meshStandardMaterial color="#718784" metalness={.7} roughness={.35} />
    </RoundedBox>)}
    <ContactShadows key={`${layout.x}-${layout.scale}`} position={[layout.x, layout.surfaceY + .005, 0]} opacity={.55} scale={8} blur={2.5} far={4} resolution={512} frames={1} color="#263b39" />
    <group position={[layout.x, layout.surfaceY, 0]} scale={layout.scale} rotation={[0, -.22, 0]}>
      <RoundedBox args={[2.62, .06, 1.3]} radius={.018} smoothness={3} position={[0, .03, -.12]} castShadow receiveShadow>
        <meshStandardMaterial color="#7e9292" metalness={.82} roughness={.3} />
      </RoundedBox>
      <group position={[0, .16, .32]} rotation={[-.24, 0, 0]}>
        <RoundedBox args={[2.3, 2.35, .06]} position={[0, 1.15, -.18]} radius={.02} smoothness={3} castShadow>
          <meshStandardMaterial color="#8ba3a1" metalness={.85} roughness={.26} />
        </RoundedBox>
        <RoundedBox args={[2.6, .13, .53]} radius={.025} smoothness={3} position={[0, -.04, .02]} castShadow>
          <meshStandardMaterial color="#798f8f" metalness={.75} roughness={.3} />
        </RoundedBox>
        <ResearchFolio />
      </group>
    </group>
  </>;
}

export default function NowStudyObject() {
  const [available, setAvailable] = useState(false);
  const [active, setActive] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [compact, setCompact] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2");
    setAvailable(Boolean(gl));
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const phone = window.matchMedia("(max-width: 760px)");
    const sync = () => { setReducedMotion(motion.matches); setCompact(phone.matches); };
    sync();
    motion.addEventListener("change", sync);
    phone.addEventListener("change", sync);
    const panel = host.current?.closest("section");
    const visibility = () => setActive(!document.hidden && !panel?.hasAttribute("inert"));
    const observer = new MutationObserver(visibility);
    if (panel) observer.observe(panel, { attributes: true, attributeFilter: ["inert"] });
    document.addEventListener("visibilitychange", visibility);
    visibility();
    return () => { motion.removeEventListener("change", sync); phone.removeEventListener("change", sync); observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  return <div ref={host} data-now-study-object aria-hidden="true" style={{ width: "100%", height: "100%" }}>
    {available ? <Canvas
      camera={{ position: [0, 2.4, 8.8], fov: 37 }}
      dpr={[1, 1.5]} shadows frameloop={active && !reducedMotion ? "always" : "demand"}
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        gl.shadowMap.type = THREE.PCFShadowMap;
        gl.domElement.addEventListener("webglcontextlost", () => setAvailable(false), { once: true });
      }}
      fallback={<div data-folio-fallback><span>HISTORY / RESEARCH</span><strong>NIXON</strong><span>THE PRESIDENCY</span></div>}
    >
      <StudyWorkstation reducedMotion={reducedMotion} compact={compact} />
    </Canvas> : <div data-folio-fallback><span>HISTORY / RESEARCH</span><strong>NIXON</strong><span>THE PRESIDENCY</span></div>}
  </div>;
}
