"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import type { TodayVoicePhase } from "@/lib/dashboard/today-voice";

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uLevel;
  uniform float uPhase;
  uniform float uMotion;

  float softCircle(vec2 p, float radius, float blur) {
    return 1.0 - smoothstep(radius - blur, radius + blur, length(p));
  }

  float strand(float value, float width) {
    return exp(-value * value * width);
  }

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    p.x *= 1.02;
    float r = length(p);
    float phaseSpeed = uPhase > 1.5 && uPhase < 2.5 ? 1.65 : (uPhase > 2.5 && uPhase < 3.5 ? 1.18 : 0.82);
    float time = uTime * uMotion * phaseSpeed;
    float pulseStrength = uPhase > 2.5 && uPhase < 3.5 ? 0.16 : (uPhase > 0.5 && uPhase < 1.5 ? 0.07 : 0.025);
    float pulse = 1.0 + uLevel * pulseStrength;
    float a = atan(p.y, p.x);
    float wobble = sin(a * 3.0 + time * 0.9) * 0.025 + sin(a * 5.0 - time * 0.6) * 0.012;
    float body = softCircle(p / pulse, 0.735 + wobble, 0.014);
    float sphereZ = sqrt(max(0.0, 1.0 - pow(min(r / 0.78, 1.0), 2.0)));
    float rim = smoothstep(0.78, 0.705, r) * body;
    float innerRim = strand(r - 0.59, 540.0) * body;
    float compression = uPhase > 1.5 && uPhase < 2.5 ? 1.55 : 1.0;
    float ribbonA = strand(p.y - 0.25 * sin(p.x * 3.1 * compression + time * 1.2), 155.0);
    float ribbonB = strand(p.y + 0.31 - 0.16 * sin(p.x * 4.0 * compression - time * 0.8), 220.0);
    float ribbonC = strand(p.y - 0.33 - 0.13 * cos(p.x * 4.8 * compression + time), 260.0);
    float ribbon = (ribbonA + ribbonB * 0.76 + ribbonC * 0.62) * body;
    float filamentA = strand(p.y - 0.11 * sin(p.x * 7.0 - time * 0.7), 1080.0) * body;
    float filamentB = strand(p.x + 0.17 * cos(p.y * 7.0 + time * 0.8), 1180.0) * body;
    float gloss = softCircle(p - vec2(-0.25, 0.29), 0.14, 0.08);

    vec3 cyan = vec3(0.26, 0.86, 0.96);
    vec3 violet = vec3(0.59, 0.31, 0.98);
    vec3 coral = vec3(1.0, 0.33, 0.45);
    vec3 pink = vec3(1.0, 0.28, 0.76);
    vec3 amber = vec3(1.0, 0.70, 0.22);
    vec3 quiet = mix(violet, pink, 0.22 + 0.18 * p.x);

    float flow = 0.5 + 0.5 * sin(p.x * 3.0 + p.y * 1.7 + time * 0.7);
    vec3 listenColor = mix(violet, cyan, flow);
    vec3 speakColor = mix(coral, pink, 0.5 + 0.5 * sin(p.x * 3.4 - time));
    vec3 thinkingColor = mix(violet, cyan, 0.5 + 0.5 * sin((p.x + p.y) * 6.0 + time * 1.7));
    vec3 color = quiet;
    if (uPhase > 0.5 && uPhase < 1.5) color = listenColor;
    if (uPhase >= 1.5 && uPhase < 2.5) color = thinkingColor;
    if (uPhase >= 2.5 && uPhase < 3.5) color = speakColor;
    if (uPhase >= 3.5) color = amber;

    color *= 0.36 + sphereZ * 0.72;
    color += mix(cyan, vec3(1.0), 0.3) * ribbon * (0.2 + uLevel * 0.5);
    color += pink * ribbonB * body * 0.24;
    float listenFilaments = uPhase > 0.5 && uPhase < 1.5 ? (0.42 + uLevel * 0.46) : 0.2;
    color += cyan * filamentA * listenFilaments;
    color += pink * filamentB * (listenFilaments * 0.72);
    color += vec3(1.0) * gloss * 0.3;
    color += vec3(0.9, 0.98, 1.0) * rim * 0.46;
    color += violet * innerRim * 0.32;

    float alpha = body * (0.91 + ribbon * 0.09);
    float halo = (1.0 - smoothstep(0.755, 0.88, r)) * (1.0 - body) * 0.07;
    alpha += halo;
    if (alpha < 0.015) discard;
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.98));
  }
`;

function phaseNumber(phase: TodayVoicePhase): number {
  if (phase === "listening" || phase === "requesting_permission" || phase === "connecting" || phase === "reconnecting") return 1;
  if (phase === "thinking" || phase === "confirming") return 2;
  if (phase === "speaking") return 3;
  if (phase === "retryable_error") return 4;
  return 0;
}

export function TodayDianaOrb({
  phase,
  inputLevel,
  outputLevel,
}: {
  phase: TodayVoicePhase;
  inputLevel: number;
  outputLevel: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const valuesRef = useRef({ phase, inputLevel, outputLevel });
  const renderCurrentFrameRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    valuesRef.current = { phase, inputLevel, outputLevel };
  }, [inputLevel, outputLevel, phase]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      canvas.dataset.todayOrbCanvas = "true";
      canvas.setAttribute("aria-hidden", "true");
      const context = canvas.getContext("2d");
      if (context) {
        context.clearRect(0, 0, 512, 512);
        const glow = context.createRadialGradient(206, 174, 12, 256, 256, 210);
        glow.addColorStop(0, "rgba(255,255,255,.92)");
        glow.addColorStop(0.18, "rgba(117,223,242,.9)");
        glow.addColorStop(0.5, "rgba(182,133,255,.92)");
        glow.addColorStop(0.78, "rgba(255,117,156,.8)");
        glow.addColorStop(1, "rgba(95,63,181,0)");
        context.fillStyle = glow;
        context.beginPath();
        context.arc(256, 256, 218, 0, Math.PI * 2);
        context.fill();
      }
      host.dataset.webglFallback = "true";
      host.appendChild(canvas);
      return () => canvas.remove();
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, innerWidth < 700 ? 1.25 : 1.75));
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.dataset.todayOrbCanvas = "true";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 2;
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 1.8 },
        uLevel: { value: 0.08 },
        uPhase: { value: phaseNumber(valuesRef.current.phase) },
        uMotion: { value: reducedMotion ? 0 : 1 },
      },
    });
    const geometry = new THREE.PlaneGeometry(1.9, 1.9);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let frame = 0;
    let visible = !document.hidden;
    const timer = new THREE.Timer();
    timer.connect(document);
    const resize = () => {
      const box = host.getBoundingClientRect();
      const size = Math.max(1, Math.min(box.width, box.height));
      renderer.setSize(size, size, false);
    };
    const render = () => {
      const values = valuesRef.current;
      const level = values.phase === "speaking" ? values.outputLevel : values.inputLevel;
      timer.update();
      material.uniforms.uTime.value += Math.min(timer.getDelta(), 0.05);
      material.uniforms.uLevel.value += (Math.min(1, level) - material.uniforms.uLevel.value) * 0.16;
      material.uniforms.uPhase.value = phaseNumber(values.phase);
      renderer.render(scene, camera);
      if (visible && !reducedMotion) frame = window.requestAnimationFrame(render);
    };
    renderCurrentFrameRef.current = () => {
      material.uniforms.uPhase.value = phaseNumber(valuesRef.current.phase);
      renderer.render(scene, camera);
    };
    const onVisibility = () => {
      visible = !document.hidden;
      if (visible) {
        window.cancelAnimationFrame(frame);
        timer.reset();
        render();
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    document.addEventListener("visibilitychange", onVisibility);
    resize();
    render();

    return () => {
      visible = false;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      geometry.dispose();
      material.dispose();
      timer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      renderCurrentFrameRef.current = () => undefined;
    };
  }, []);

  useEffect(() => {
    renderCurrentFrameRef.current();
  }, [phase]);

  return <div ref={hostRef} className="today-diana-orb" data-phase={phase} />;
}
