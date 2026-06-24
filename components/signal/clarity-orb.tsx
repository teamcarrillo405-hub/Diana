"use client";

import { useEffect, useRef } from "react";
import type * as THREE_TYPES from "three";

export type DianaOrbState = "low" | "okay" | "on-it" | "overwhelmed" | "creative";

type OrbPalette = {
  nodes: number[];
  sparks: number[];
  environment: [string, string, string, string];
  ambient: number;
  rim: number;
  fill: number;
  emissive: number;
  exposure: number;
  rotationSpeed: number;
  breathe: number;
  response: number;
  returnForce: number;
  damping: number;
  disorder: number;
};

const ORB_PALETTES: Record<DianaOrbState, OrbPalette> = {
  low: {
    nodes: [0xf2c879, 0xd89a3d, 0x8f6a25, 0xfff2c7],
    sparks: [0xfff0bd, 0xf2c879, 0xe2a84e, 0xfffbeb],
    environment: ["#fff8dc", "#f2c879", "#d89a3d", "#4c2c12"],
    ambient: 1,
    rim: 0xf2c879,
    fill: 0xfff0bd,
    emissive: 0xd89a3d,
    exposure: 1.18,
    rotationSpeed: 0.00036,
    breathe: 0.026,
    response: 0.028,
    returnForce: 0.032,
    damping: 0.91,
    disorder: 0.16,
  },
  okay: {
    nodes: [0x35b6a8, 0x2f8f83, 0x164e47, 0xd7fbf3],
    sparks: [0xcffaf2, 0x5eead4, 0x35b6a8, 0xf2fffb],
    environment: ["#f5fffc", "#b7f4e9", "#35b6a8", "#143c38"],
    ambient: 0.95,
    rim: 0x5eead4,
    fill: 0xcffaf2,
    emissive: 0x2f8f83,
    exposure: 1.12,
    rotationSpeed: 0.00042,
    breathe: 0.028,
    response: 0.032,
    returnForce: 0.034,
    damping: 0.9,
    disorder: 0.12,
  },
  "on-it": {
    nodes: [0x6d5bd0, 0x4f46a5, 0x1f2f6f, 0xded8ff],
    sparks: [0xe7e2ff, 0x9b8cff, 0x6d5bd0, 0xf8f6ff],
    environment: ["#f8f6ff", "#d9d3ff", "#6d5bd0", "#151a3c"],
    ambient: 0.92,
    rim: 0x9b8cff,
    fill: 0xded8ff,
    emissive: 0x4f46a5,
    exposure: 1.16,
    rotationSpeed: 0.00058,
    breathe: 0.034,
    response: 0.04,
    returnForce: 0.038,
    damping: 0.89,
    disorder: 0.1,
  },
  overwhelmed: {
    nodes: [0xf28da0, 0xb7a5c9, 0x76609a, 0xf4eaff],
    sparks: [0xffedf1, 0xe7dcf3, 0xc8b7dc, 0xffffff],
    environment: ["#fff7fa", "#f3d8e0", "#b7a5c9", "#35283e"],
    ambient: 1.05,
    rim: 0xf28da0,
    fill: 0xf1eafb,
    emissive: 0x76609a,
    exposure: 1.06,
    rotationSpeed: 0.00024,
    breathe: 0.018,
    response: 0.024,
    returnForce: 0.026,
    damping: 0.925,
    disorder: 0.28,
  },
  creative: {
    nodes: [0x42cbbb, 0x7d73df, 0xe08ab8, 0xf7d2e8],
    sparks: [0xdcfff8, 0xe7ddff, 0xffd1e8, 0xffffff],
    environment: ["#f6fffb", "#bbf2eb", "#ead9ff", "#5b2949"],
    ambient: 1.04,
    rim: 0xd98ab5,
    fill: 0xe7ddff,
    emissive: 0x7d73df,
    exposure: 1.18,
    rotationSpeed: 0.00046,
    breathe: 0.038,
    response: 0.036,
    returnForce: 0.032,
    damping: 0.895,
    disorder: 0.2,
  },
};

type ClarityOrbProps = {
  size?: number;
  visualScale?: number;
  state?: DianaOrbState;
  className?: string;
  label?: string;
};

export function ClarityOrb({
  size = 280,
  visualScale = 1,
  state = "okay",
  className,
  label = "Interactive Diana clarity orb",
}: ClarityOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationId = 0;
    let disposed = false;
    const cleanupFns: Array<() => void> = [];

    void (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const isLowPower =
        navigator.hardwareConcurrency <= 4 ||
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const palette = ORB_PALETTES[state];
      const nodeCount = reducedMotion
        ? state === "overwhelmed" ? 104 : 116
        : isLowPower
          ? state === "overwhelmed" ? 118 : 132
          : state === "overwhelmed" ? 158 : 176;
      const clusterRadius = state === "overwhelmed" ? 0.99 : state === "creative" ? 0.97 : 0.92;
      const nodeRadius = isLowPower ? 0.092 : 0.096;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setSize(size, size, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = palette.exposure;
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 200);
      camera.position.set(0, 0.06, 3.28);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.AmbientLight(0xf8fafc, palette.ambient));
      const keyLight = new THREE.DirectionalLight(0xf8fbff, 3.8);
      keyLight.position.set(3, 3.5, 5);
      scene.add(keyLight);
      const rimLight = new THREE.DirectionalLight(palette.rim, 2.15);
      rimLight.position.set(-3, 2.2, -4);
      scene.add(rimLight);
      const fillLight = new THREE.DirectionalLight(palette.fill, 1.35);
      fillLight.position.set(-2.5, -1, 3);
      scene.add(fillLight);

      const environmentCanvas = document.createElement("canvas");
      environmentCanvas.width = 256;
      environmentCanvas.height = 128;
      const ctx = environmentCanvas.getContext("2d");
      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 128);
        gradient.addColorStop(0, palette.environment[0]);
        gradient.addColorStop(0.3, palette.environment[1]);
        gradient.addColorStop(0.6, palette.environment[2]);
        gradient.addColorStop(1, palette.environment[3]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 128);
        const glint = ctx.createRadialGradient(186, 28, 0, 186, 28, 48);
        glint.addColorStop(0, "rgba(255,255,255,0.96)");
        glint.addColorStop(0.48, "rgba(255,255,255,0.46)");
        glint.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = glint;
        ctx.fillRect(0, 0, 256, 128);

        const pmrem = new THREE.PMREMGenerator(renderer);
        const texture = new THREE.CanvasTexture(environmentCanvas);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = pmrem.fromEquirectangular(texture).texture;
        texture.dispose();
        pmrem.dispose();
      }

      const restPositions: THREE_TYPES.Vector3[] = [];
      const baseScale = new Float32Array(nodeCount);
      const depthBias = new Float32Array(nodeCount);
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < nodeCount; i += 1) {
        const y = 1 - (i / (nodeCount - 1)) * 2;
        const radius = Math.sqrt(Math.max(0, 1 - y * y));
        const angle = goldenAngle * i;
        const shellNoise =
          0.94 +
          Math.sin(i * 1.731) * (0.032 + palette.disorder * 0.08) +
          Math.cos(i * 0.617) * (0.026 + palette.disorder * 0.055);
        const xWobble = 1 + Math.sin(i * 0.379) * (0.026 + palette.disorder * 0.05);
        const yWobble = 0.98 + Math.cos(i * 0.421) * (0.026 + palette.disorder * 0.045);
        const zWobble = 1.01 + Math.sin(i * 0.293) * (0.038 + palette.disorder * 0.055);
        const x = clusterRadius * shellNoise * xWobble * radius * Math.cos(angle);
        const z = clusterRadius * shellNoise * zWobble * radius * Math.sin(angle);
        restPositions.push(
          new THREE.Vector3(
            x,
            clusterRadius * shellNoise * yWobble * y,
            z,
          ),
        );
        depthBias[i] = z;
        baseScale[i] = 0.84 + (((i * 29) % 17) / 100) + Math.max(0, z) * 0.08;
      }

      const positions = restPositions.map((position) => position.clone());
      const velocities = restPositions.map(() => new THREE.Vector3());
      const dummy = new THREE.Object3D();
      const localRay = new THREE.Ray();
      const localOrigin = new THREE.Vector3();
      const localDirection = new THREE.Vector3();
      const closest = new THREE.Vector3();
      const push = new THREE.Vector3();
      const inverseMatrix = new THREE.Matrix4();
      const color = new THREE.Color();
      const white = new THREE.Color(0xffffff);
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2(-9999, -9999);

      const colorCycle = palette.nodes.map((activeColor) => new THREE.Color(activeColor));
      const sparkColorCycle = palette.sparks.map((activeColor) => new THREE.Color(activeColor));
      const huePhase = new Float32Array(nodeCount);
      const flash = new Float32Array(nodeCount);
      const scalePulse = new Float32Array(nodeCount);

      const nodeGeometry = new THREE.SphereGeometry(nodeRadius, 12, 10);
      const nodeMaterial = new THREE.MeshPhysicalMaterial({
        color: palette.nodes[0],
        metalness: 0.02,
        roughness: 0.34,
        clearcoat: 0.78,
        clearcoatRoughness: 0.38,
        envMapIntensity: 1.75,
        emissive: new THREE.Color(palette.emissive),
        emissiveIntensity: 0.055,
      });

      const clusterMesh = new THREE.InstancedMesh(nodeGeometry, nodeMaterial, nodeCount);
      clusterMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      for (let i = 0; i < nodeCount; i += 1) {
        dummy.position.copy(restPositions[i]);
        dummy.scale.setScalar(baseScale[i]);
        dummy.updateMatrix();
        clusterMesh.setMatrixAt(i, dummy.matrix);
        clusterMesh.setColorAt(i, colorCycle[i % colorCycle.length]);
      }
      clusterMesh.instanceMatrix.needsUpdate = true;
      if (clusterMesh.instanceColor) clusterMesh.instanceColor.needsUpdate = true;

      const readVisualScale = () => {
        const rawScale = window.getComputedStyle(canvas).getPropertyValue("--clarity-three-scale").trim();
        const cssScale = Number.parseFloat(rawScale);
        return Number.isFinite(cssScale) && cssScale > 0 ? cssScale : visualScale;
      };

      const group = new THREE.Group();
      group.scale.setScalar(readVisualScale());
      group.add(clusterMesh);
      scene.add(group);

      const syncVisualScale = () => {
        group.scale.setScalar(readVisualScale());
        group.updateMatrixWorld(true);
      };
      const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(syncVisualScale) : null;
      resizeObserver?.observe(canvas);
      window.addEventListener("resize", syncVisualScale);

      const sparkLimit = isLowPower ? 220 : 480;
      const sparkPositions = new Float32Array(sparkLimit * 3);
      const sparkInitialColors = new Float32Array(sparkLimit * 3);
      const sparkColors = new Float32Array(sparkLimit * 3);
      const sparkLife = new Float32Array(sparkLimit);
      const sparkVelocityX = new Float32Array(sparkLimit);
      const sparkVelocityY = new Float32Array(sparkLimit);
      const sparkVelocityZ = new Float32Array(sparkLimit);
      const sparkWorld = new THREE.Vector3();
      for (let i = 0; i < sparkLimit; i += 1) sparkPositions[i * 3 + 1] = -999;

      const sparkGeometry = new THREE.BufferGeometry();
      sparkGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(sparkPositions, 3).setUsage(THREE.DynamicDrawUsage),
      );
      sparkGeometry.setAttribute(
        "color",
        new THREE.BufferAttribute(sparkColors, 3).setUsage(THREE.DynamicDrawUsage),
      );
      const sparkCanvas = document.createElement("canvas");
      sparkCanvas.width = 48;
      sparkCanvas.height = 48;
      const sparkContext = sparkCanvas.getContext("2d");
      if (sparkContext) {
        const sparkInner = new THREE.Color(palette.fill);
        const sparkEdge = new THREE.Color(palette.rim);
        const rgba = (activeColor: THREE_TYPES.Color, alpha: number) =>
          `rgba(${Math.round(activeColor.r * 255)},${Math.round(activeColor.g * 255)},${Math.round(activeColor.b * 255)},${alpha})`;
        const sparkGradient = sparkContext.createRadialGradient(24, 24, 0, 24, 24, 24);
        sparkGradient.addColorStop(0, "rgba(255,255,255,0.95)");
        sparkGradient.addColorStop(0.34, rgba(sparkInner, 0.72));
        sparkGradient.addColorStop(0.66, rgba(sparkEdge, 0.34));
        sparkGradient.addColorStop(1, rgba(sparkEdge, 0));
        sparkContext.fillStyle = sparkGradient;
        sparkContext.fillRect(0, 0, 48, 48);
      }
      const sparkTexture = new THREE.CanvasTexture(sparkCanvas);
      const sparkMaterial = new THREE.PointsMaterial({
        size: isLowPower ? 0.028 : 0.038,
        map: sparkTexture,
        alphaMap: sparkTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });
      const sparks = new THREE.Points(sparkGeometry, sparkMaterial);
      sparks.frustumCulled = false;
      scene.add(sparks);

      let nextSpark = 0;
      const emitSpark = (x: number, y: number, z: number, colorIndex: number, speed: number) => {
        if (reducedMotion) return;
        const index = nextSpark;
        nextSpark = (nextSpark + 1) % sparkLimit;
        const activeColor = sparkColorCycle[colorIndex % sparkColorCycle.length];
        const sparkSpeed = (0.012 + Math.random() * 0.024) * speed;
        let dx = Math.random() - 0.5;
        let dy = Math.random() - 0.5;
        let dz = Math.random() - 0.5;
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        dx /= length;
        dy /= length;
        dz /= length;
        sparkVelocityX[index] = dx * sparkSpeed;
        sparkVelocityY[index] = dy * sparkSpeed;
        sparkVelocityZ[index] = dz * sparkSpeed;
        sparkPositions[index * 3] = x + dx * nodeRadius;
        sparkPositions[index * 3 + 1] = y + dy * nodeRadius;
        sparkPositions[index * 3 + 2] = z + dz * nodeRadius;
        sparkInitialColors[index * 3] = activeColor.r;
        sparkInitialColors[index * 3 + 1] = activeColor.g;
        sparkInitialColors[index * 3 + 2] = activeColor.b;
        sparkColors[index * 3] = activeColor.r;
        sparkColors[index * 3 + 1] = activeColor.g;
        sparkColors[index * 3 + 2] = activeColor.b;
        sparkLife[index] = 0.24 + Math.random() * 0.16;
      };

      const setPointer = (clientX: number, clientY: number) => {
        const rect = canvas.getBoundingClientRect();
        if (
          clientX < rect.left ||
          clientX > rect.right ||
          clientY < rect.top ||
          clientY > rect.bottom
        ) {
          pointer.set(-9999, -9999);
          return;
        }

        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      };
      const onPointerMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        setPointer(event.clientX, event.clientY);
      };
      const onPointerLeave = () => pointer.set(-9999, -9999);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("blur", onPointerLeave);
      document.addEventListener("mouseleave", onPointerLeave);

      const renderFrame = () => {
        if (disposed) return;
        if (reducedMotion) {
          renderer.render(scene, camera);
          return;
        }

        animationId = requestAnimationFrame(renderFrame);
        const now = performance.now();
        group.rotation.y += palette.rotationSpeed;
        group.rotation.x = Math.sin(now / 9200) * palette.breathe;
        group.rotation.z = Math.cos(now / 11800) * palette.breathe * 0.35;
        group.updateMatrixWorld(true);

        inverseMatrix.copy(group.matrixWorld).invert();
        raycaster.setFromCamera(pointer, camera);
        localOrigin.copy(raycaster.ray.origin).applyMatrix4(inverseMatrix);
        localDirection.copy(raycaster.ray.direction).transformDirection(inverseMatrix).normalize();
        localRay.set(localOrigin, localDirection);

        for (let i = 0; i < nodeCount; i += 1) {
          const position = positions[i];
          const velocity = velocities[i];

          localRay.closestPointToPoint(position, closest);
          const distance = position.distanceTo(closest);
          const influenceRadius = 0.38 + palette.disorder * 0.18;
          if (distance < influenceRadius) {
            const strength = (1 - distance / influenceRadius) * palette.response;
            push.copy(position).sub(closest).normalize().multiplyScalar(strength);
            velocity.add(push);
            const previousPhase = huePhase[i] % colorCycle.length;
            huePhase[i] += strength * 8.5;
            if (Math.floor(huePhase[i] % colorCycle.length) !== Math.floor(previousPhase)) {
              flash[i] = 1;
              scalePulse[i] = 1;
              sparkWorld.copy(position).applyMatrix4(group.matrixWorld);
              for (let n = 0; n < 2; n += 1) {
                emitSpark(sparkWorld.x, sparkWorld.y, sparkWorld.z, Math.floor(previousPhase), 0.78);
              }
            }
          }

          velocity.x += (restPositions[i].x - position.x) * palette.returnForce;
          velocity.y += (restPositions[i].y - position.y) * palette.returnForce;
          velocity.z += (restPositions[i].z - position.z) * palette.returnForce;
          velocity.multiplyScalar(palette.damping);
          position.add(velocity);

          huePhase[i] = Math.max(0, huePhase[i] - 0.012);
          const phase = huePhase[i] % colorCycle.length;
          const fromIndex = Math.floor(phase) % colorCycle.length;
          const toIndex = (fromIndex + 1) % colorCycle.length;
          color.lerpColors(colorCycle[fromIndex], colorCycle[toIndex], phase - fromIndex);
          flash[i] *= 0.8;
          if (flash[i] > 0.005) color.lerp(white, flash[i] * 0.72);
          clusterMesh.setColorAt(i, color);

          if (huePhase[i] > 0.08 && Math.random() < 0.028) {
            sparkWorld.copy(position).applyMatrix4(group.matrixWorld);
            emitSpark(sparkWorld.x, sparkWorld.y, sparkWorld.z, fromIndex, 0.4);
          }

          scalePulse[i] *= 0.88;
          dummy.position.copy(position);
          dummy.scale.setScalar(baseScale[i] + Math.max(0, depthBias[i]) * 0.08 + scalePulse[i] * 0.12);
          dummy.updateMatrix();
          clusterMesh.setMatrixAt(i, dummy.matrix);
        }
        clusterMesh.instanceMatrix.needsUpdate = true;
        if (clusterMesh.instanceColor) clusterMesh.instanceColor.needsUpdate = true;

        let sparksDirty = false;
        for (let i = 0; i < sparkLimit; i += 1) {
          if (sparkLife[i] <= 0) continue;
          sparksDirty = true;
          sparkLife[i] -= 0.022;
          if (sparkLife[i] <= 0) {
            sparkPositions[i * 3 + 1] = -999;
            sparkLife[i] = 0;
            continue;
          }
          sparkPositions[i * 3] += sparkVelocityX[i];
          sparkPositions[i * 3 + 1] += sparkVelocityY[i];
          sparkPositions[i * 3 + 2] += sparkVelocityZ[i];
          sparkVelocityX[i] *= 0.94;
          sparkVelocityY[i] *= 0.94;
          sparkVelocityZ[i] *= 0.94;
          const fade = sparkLife[i] * sparkLife[i];
          sparkColors[i * 3] = sparkInitialColors[i * 3] * fade;
          sparkColors[i * 3 + 1] = sparkInitialColors[i * 3 + 1] * fade;
          sparkColors[i * 3 + 2] = sparkInitialColors[i * 3 + 2] * fade;
        }
        if (sparksDirty) {
          sparkGeometry.attributes.position.needsUpdate = true;
          sparkGeometry.attributes.color.needsUpdate = true;
        }

        renderer.render(scene, camera);
      };

      cleanupFns.push(
        () => resizeObserver?.disconnect(),
        () => window.removeEventListener("resize", syncVisualScale),
        () => window.removeEventListener("pointermove", onPointerMove),
        () => window.removeEventListener("blur", onPointerLeave),
        () => document.removeEventListener("mouseleave", onPointerLeave),
        () => renderer.dispose(),
        () => nodeGeometry.dispose(),
        () => nodeMaterial.dispose(),
        () => sparkGeometry.dispose(),
        () => sparkTexture.dispose(),
        () => sparkMaterial.dispose(),
      );

      renderFrame();
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      cleanupFns.forEach((cleanup) => cleanup());
    };
  }, [size, state, visualScale]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      width={size}
      height={size}
      aria-label={label}
      role="img"
    />
  );
}
