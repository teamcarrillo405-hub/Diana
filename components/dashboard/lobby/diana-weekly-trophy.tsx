"use client";

import { useEffect, useId, useRef, useState } from "react";
import type * as Three from "three";
import styles from "./diana-weekly-trophy.module.css";

const BRAND_SYMBOL = "/landing-3d/logo-mask/diana-logo-header.svg";

export type DianaWeeklyTrophyProps = {
  earned: boolean;
  /** Optional for tab systems that hide panels without hidden/inert/aria-hidden. */
  active?: boolean;
};

type TrophyRuntime = {
  render: () => void;
  point: (x: number, y: number) => void;
  reset: () => void;
  resize: () => void;
  earned: (value: boolean) => void;
  dispose: () => void;
};

/** Decorative only: the parent owns dimensions, award name, requirement, and earned state. */
export function DianaWeeklyTrophy({ earned, active = true }: DianaWeeklyTrophyProps) {
  const fallbackId = useId();
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const latest = useRef({ earned, active });
  const synchronize = useRef<() => void>(() => {});
  const runtime = useRef<TrophyRuntime | null>(null);
  const [status, setStatus] = useState<"fallback" | "loading" | "ready">("fallback");

  useEffect(() => {
    latest.current = { earned, active };
    runtime.current?.earned(earned);
    synchronize.current();
  }, [earned, active]);

  useEffect(() => {
    const element = host.current;
    const surface = canvas.current;
    if (!element || !surface) return;

    let disposed = false;
    let visible = false;
    let initializing = false;
    let unavailable = false;
    let frame = 0;
    let frames = 0;
    const abort = new AbortController();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ancestors: HTMLElement[] = [];
    for (let parent = element.parentElement; parent; parent = parent.parentElement) ancestors.push(parent);

    const isActive = () => !disposed && visible && latest.current.active && !document.hidden
      && !ancestors.some(parent => parent.hidden || parent.hasAttribute("inert") || parent.getAttribute("aria-hidden") === "true")
      && element.getClientRects().length > 0
      && !ancestors.some(parent => {
        const style = getComputedStyle(parent);
        return style.visibility === "hidden" || style.contentVisibility === "hidden";
      });

    function cancelFrame() {
      cancelAnimationFrame(frame);
      frame = 0;
    }

    function fallback() {
      unavailable = true;
      cancelFrame();
      runtime.current?.dispose();
      runtime.current = null;
      if (!disposed) setStatus("fallback");
    }

    // One frame per invalidation, never an autonomous animation loop.
    function invalidate() {
      if (frame || !runtime.current || !isActive()) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!runtime.current || !isActive()) return;
        try {
          runtime.current.render();
          element!.dataset.trophyFrames = String(++frames);
          setStatus("ready");
        } catch {
          fallback();
        }
      });
    }

    async function initialize() {
      if (initializing || unavailable || runtime.current || !isActive()) return;
      initializing = true;
      setStatus("loading");
      const resources = new Set<{ dispose: () => void }>();
      let renderer: Three.WebGLRenderer | undefined;
      let context: WebGL2RenderingContext | null = null;
      let released = false;
      function release() {
        if (released) return;
        released = true;
        resources.forEach(resource => resource.dispose());
        resources.clear();
        renderer?.dispose();
        // Release the context without dispatching a component fallback on unmount.
        surface!.removeEventListener("webglcontextlost", contextLost);
        context?.getExtension("WEBGL_lose_context")?.loseContext();
      }
      const own = <T extends { dispose: () => void }>(resource: T): T => {
        resources.add(resource);
        return resource;
      };

      try {
        const THREE = await import("three");
        const { SVGLoader } = await import("three/examples/jsm/loaders/SVGLoader.js");
        const { RoundedBoxGeometry } = await import("three/examples/jsm/geometries/RoundedBoxGeometry.js");
        const { TessellateModifier } = await import("three/examples/jsm/modifiers/TessellateModifier.js");
        const { mergeVertices } = await import("three/examples/jsm/utils/BufferGeometryUtils.js");
        const response = await fetch(BRAND_SYMBOL, { signal: abort.signal });
        if (!response.ok) throw new Error("Brand symbol unavailable");
        const source = await response.text();
        if (!isActive()) return;

        // Use the actual logo's first path only. The other paths are the wordmark.
        const xml = new DOMParser().parseFromString(source, "image/svg+xml");
        const outline = xml.querySelector("path")?.getAttribute("d");
        if (!outline || xml.querySelector("parsererror")) throw new Error("Brand outline unavailable");
        const symbolSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        const symbolPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        symbolPath.setAttribute("d", outline);
        symbolSvg.append(symbolPath);
        const paths = new SVGLoader().parse(new XMLSerializer().serializeToString(symbolSvg)).paths;
        const shape = SVGLoader.createShapes(paths[0])[0];
        if (!shape) throw new Error("Brand geometry unavailable");

        context = surface!.getContext("webgl2", { alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: true, powerPreference: "low-power" });
        if (!context) throw new Error("WebGL unavailable");
        renderer = new THREE.WebGLRenderer({ canvas: surface!, context, alpha: true, antialias: true });
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, 1, .1, 40);
        camera.position.set(0, 2.32, 7.6);
        camera.lookAt(0, 1.56, 0);

        // Local studio light cards produce broad jewellery-like reflections, no HDR download.
        const studio = new THREE.Scene();
        studio.background = new THREE.Color("#15191d");
        const cardGeometry = own(new THREE.PlaneGeometry(1, 1));
        function card(color: string, intensity: number, position: [number, number, number], size: [number, number]) {
          const material = own(new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
          const mesh = new THREE.Mesh(cardGeometry, material);
          mesh.position.set(...position);
          mesh.scale.set(size[0], size[1], 1);
          mesh.lookAt(0, 0, 0);
          studio.add(mesh);
        }
        card("#fff9f0", 5, [-3, 4, 4], [3, 6]);
        card("#ffffff", 3, [4, 2, 3], [1.1, 5]);
        card("#f1b4d1", 2.2, [-4, 0, .5], [1.6, 4]);
        card("#aee6f0", 2.4, [3, 1, 0], [1.5, 5]);
        card("#f7ecd6", 2, [0, 5, -1], [5, 3]);
        const generator = own(new THREE.PMREMGenerator(renderer));
        const environment = own(generator.fromScene(studio, .045, .1, 30, { size: 128 }));
        scene.environment = environment.texture;
        scene.environmentIntensity = .8;

        const pearl = own(new THREE.MeshPhysicalMaterial({
          color: "#f0ede8", metalness: .76, roughness: .24,
          clearcoat: .85, clearcoatRoughness: .16,
          iridescence: .12, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 300],
        }));
        const champagne = own(new THREE.MeshPhysicalMaterial({
          color: "#eeeae4", metalness: .74, roughness: .23,
          clearcoat: 1, clearcoatRoughness: .14,
          iridescence: .08, iridescenceThicknessRange: [200, 320],
        }));

        // The environment's sculptures have pearlescent faces and luminous bevels,
        // not separate solid-color lobes. Keep the lighting attached to the object.
        const illumination = { value: latest.current.earned ? 1 : 0 };
        const neonPink = new THREE.Color("#ff9ddd");
        const neonPearl = new THREE.Color("#9baadd");
        const neonCyan = new THREE.Color("#80eaff");
        function edgeLitMaterial(material: Three.MeshPhysicalMaterial, min: number, width: number) {
          material.onBeforeCompile = shader => {
            Object.assign(shader.uniforms, {
              trophyIllumination: illumination,
              trophyPink: { value: neonPink },
              trophyPearl: { value: neonPearl },
              trophyCyan: { value: neonCyan },
              trophyMin: { value: min },
              trophyWidth: { value: width },
            });
            shader.vertexShader = shader.vertexShader
              .replace("#include <common>", "#include <common>\nvarying vec3 vTrophyPosition;")
              .replace("#include <begin_vertex>", "#include <begin_vertex>\nvTrophyPosition = position;");
            shader.fragmentShader = shader.fragmentShader
              .replace("#include <common>", `#include <common>
                varying vec3 vTrophyPosition;
                uniform float trophyIllumination;
                uniform vec3 trophyPink;
                uniform vec3 trophyPearl;
                uniform vec3 trophyCyan;
                uniform float trophyMin;
                uniform float trophyWidth;
              `)
              .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
                float across = clamp((vTrophyPosition.x + vTrophyPosition.y * 0.16 - trophyMin) / trophyWidth, 0.0, 1.0);
                vec3 pearlTint = mix(trophyPink, trophyPearl, smoothstep(0.0, 0.52, across));
                pearlTint = mix(pearlTint, trophyCyan, smoothstep(0.48, 1.0, across));
                vec3 edgeTint = mix(trophyPink, trophyCyan, smoothstep(0.28, 0.72, across));
                float rim = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.0);
                diffuseColor.rgb = mix(diffuseColor.rgb, pearlTint * 0.64, trophyIllumination);
                totalEmissiveRadiance += trophyIllumination * (pearlTint * 0.07 + edgeTint * rim * 3.6);
              `);
          };
          material.customProgramCacheKey = () => `diana-neon-trophy-v1-${min}-${width}`;
        }
        edgeLitMaterial(pearl, -1.05, 2.1);
        edgeLitMaterial(champagne, -.26, 1.45);

        const glowLayers: Three.Mesh[] = [];
        function addEdgeGlow(object: Three.Mesh) {
          for (const [scale, opacity] of [[1.045, .15], [1.08, .045]]) {
            const glowMaterial = own(new THREE.ShaderMaterial({
              transparent: true, depthWrite: false, side: THREE.BackSide,
              blending: THREE.AdditiveBlending,
              uniforms: {
                pink: { value: neonPink }, cyan: { value: neonCyan },
                opacity: { value: opacity },
              },
              vertexShader: `
                varying vec3 vGlowNormal;
                varying vec3 vGlowView;
                varying float vGlowAcross;
                void main() {
                  vec4 view = modelViewMatrix * vec4(position, 1.0);
                  vGlowNormal = normalize(normalMatrix * normal);
                  vGlowView = -view.xyz;
                  vGlowAcross = position.x;
                  gl_Position = projectionMatrix * view;
                }
              `,
              fragmentShader: `
                uniform vec3 pink;
                uniform vec3 cyan;
                uniform float opacity;
                varying vec3 vGlowNormal;
                varying vec3 vGlowView;
                varying float vGlowAcross;
                void main() {
                  float rim = pow(1.0 - abs(dot(normalize(vGlowNormal), normalize(vGlowView))), 1.4);
                  vec3 tint = mix(pink, cyan, smoothstep(-0.5, 0.6, vGlowAcross));
                  gl_FragColor = vec4(tint, rim * opacity);
                  #include <colorspace_fragment>
                }
              `,
            }));
            const glow = new THREE.Mesh(object.geometry, glowMaterial);
            glow.position.copy(object.position);
            glow.scale.setScalar(scale);
            glow.renderOrder = 1;
            object.parent!.add(glow);
            glowLayers.push(glow);
          }
        }
        const graphite = own(new THREE.MeshPhysicalMaterial({ color: "#161c1e", metalness: .6, roughness: .3, clearcoat: .5 }));
        const trim = own(new THREE.MeshStandardMaterial({ color: "#ab9e8c", metalness: .9, roughness: .24 }));
        const trophy = new THREE.Group();
        trophy.rotation.y = -.27;
        scene.add(trophy);

        function mesh(geometry: Three.BufferGeometry, material: Three.Material, position: [number, number, number], parent: Three.Group = trophy) {
          const object = new THREE.Mesh(own(geometry), material);
          object.position.set(...position);
          object.castShadow = true;
          object.receiveShadow = parent === trophy;
          parent.add(object);
          return object;
        }

        mesh(new RoundedBoxGeometry(1.72, .27, 1.1, 4, .07), graphite, [0, .22, 0]);
        mesh(new RoundedBoxGeometry(1.62, .035, 1.01, 3, .016), trim, [0, .37, 0]);
        mesh(new RoundedBoxGeometry(1.55, .045, .94, 3, .02), graphite, [0, .405, 0]);
        mesh(new RoundedBoxGeometry(1.55, .035, .95, 2, .016), graphite, [0, .071, 0]);
        // Two short concealed mounts, not a cup stem, hold the logo just above the plinth.
        for (const x of [-.28, .28]) mesh(new THREE.CylinderGeometry(.045, .055, .39, 24), trim, [x, .57, -.05]);

        const sculpture = new THREE.Group();
        sculpture.position.set(0, 1.86, 0);
        trophy.add(sculpture);

        // Subdivide the cap before doming it: broad curved faces catch the studio cards.
        function cushion(source: Three.BufferGeometry, center: [number, number], radius: [number, number], depth: number) {
          own(source);
          const smooth = own(new TessellateModifier(.16, 5).modify(source));
          const vertices = smooth.getAttribute("position");
          for (let index = 0; index < vertices.count; index++) {
            const x = (vertices.getX(index) - center[0]) / radius[0];
            const y = (vertices.getY(index) - center[1]) / radius[1];
            const dome = Math.max(0, 1 - x * x - y * y);
            const z = vertices.getZ(index);
            vertices.setZ(index, z + Math.sign(z) * depth * dome);
          }
          smooth.deleteAttribute("normal");
          smooth.deleteAttribute("uv");
          const welded = own(mergeVertices(smooth, .0001));
          welded.computeVertexNormals();
          return welded;
        }

        const body = own(new THREE.ExtrudeGeometry(shape, {
          depth: 7.5, steps: 1, bevelEnabled: true,
          bevelThickness: 5.2, bevelSize: 4.4, bevelSegments: 10, curveSegments: 14,
        }));
        body.scale(1 / 36, -1 / 36, 1 / 36);
        body.center();
        // Restore outward normals after the SVG's y-down coordinates are reflected.
        const position = body.getAttribute("position");
        const uv = body.getAttribute("uv");
        for (let i = 0; i < position.count; i += 3) {
          for (const attribute of [position, uv]) {
            for (let axis = 0; axis < attribute.itemSize; axis++) {
              const a = attribute.getComponent(i, axis);
              attribute.setComponent(i, axis, attribute.getComponent(i + 2, axis));
              attribute.setComponent(i + 2, axis, a);
            }
          }
        }
        body.computeVertexNormals();
        const logoBody = mesh(body, pearl, [0, 0, -.015], sculpture);
        // Keep polished logo faces free of self-shadow acne; the base receives their shadows.
        logoBody.receiveShadow = false;

        // The raised front lobe follows the overlapping capsule in diana-high-def-logo.svg.
        const lobe = new THREE.Shape();
        lobe.moveTo(.18, .17);
        lobe.bezierCurveTo(.45, .64, .96, .5, 1.04, .11);
        lobe.bezierCurveTo(1.1, -.12, .91, -.48, .72, -.79);
        lobe.bezierCurveTo(.47, -1.21, -.07, -1.12, -.19, -.72);
        lobe.bezierCurveTo(-.29, -.45, .04, -.08, .18, .17);
        const lobeGeometry = new THREE.ExtrudeGeometry(lobe, {
          depth: .15, steps: 1, bevelEnabled: true,
          bevelSize: .085, bevelThickness: .15, bevelSegments: 12, curveSegments: 28,
        });
        lobeGeometry.translate(0, 0, -.075);
        const logoLobe = mesh(cushion(lobeGeometry, [.43, -.28], [.7, 1.02], .16), champagne, [-.05, -.005, .3], sculpture);
        logoLobe.receiveShadow = false;
        addEdgeGlow(logoBody);
        addEdgeGlow(logoLobe);

        const hemisphere = new THREE.HemisphereLight("#eef6ff", "#6a5650", 1.2);
        scene.add(hemisphere);
        const key = new THREE.DirectionalLight("#fff4e3", 3);
        key.position.set(-3, 6, 5);
        key.castShadow = true;
        key.shadow.mapSize.set(512, 512);
        key.shadow.camera.left = -3;
        key.shadow.camera.right = 3;
        key.shadow.camera.top = 4;
        key.shadow.camera.bottom = -2;
        key.shadow.normalBias = .035;
        key.shadow.bias = -.0003;
        own(key.shadow);
        scene.add(key);
        const pink = new THREE.DirectionalLight("#edb4cc", 1.8);
        pink.position.set(-4, 2, .4);
        scene.add(pink);
        const cyan = new THREE.DirectionalLight("#9ad9e6", 2.1);
        cyan.position.set(4, 3, .3);
        scene.add(cyan);

        // A transparent shadow catcher grounds the object without introducing a panel.
        const ground = new THREE.Mesh(own(new THREE.PlaneGeometry(7, 7)), own(new THREE.ShadowMaterial({ opacity: .24, depthWrite: false })));
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = .045;
        ground.receiveShadow = true;
        scene.add(ground);

        const setEarned = (value: boolean) => {
          illumination.value = value ? 1 : 0;
          glowLayers.forEach(layer => { layer.visible = value; });
          pearl.metalness = value ? .28 : .76;
          champagne.metalness = value ? .25 : .74;
          pearl.roughness = value ? .19 : .27;
          champagne.roughness = value ? .18 : .26;
          pearl.iridescence = value ? .28 : .1;
          champagne.iridescence = value ? .24 : .08;
          trim.color.set(value ? "#a8d6df" : "#ab9e8c");
          trim.emissive.set(value ? "#5bd9ee" : "#000000");
          trim.emissiveIntensity = value ? .2 : 0;
          pink.intensity = value ? 2.4 : 1.8;
          cyan.intensity = value ? 2.7 : 2.1;
        };
        const resize = () => {
          const { width, height } = element!.getBoundingClientRect();
          if (!width || !height) return;
          renderer!.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          renderer!.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        const reset = () => { trophy.rotation.set(0, -.27, 0); };
        runtime.current = {
          render: () => renderer!.render(scene, camera),
          point: (x, y) => { trophy.rotation.set(y * .035, -.27 + x * .12, 0); },
          reset, resize, earned: setEarned, dispose: release,
        };
        setEarned(latest.current.earned);
        resize();
        invalidate();
      } catch {
        release();
        if (!disposed && !abort.signal.aborted) fallback();
      } finally {
        initializing = false;
      }
    }

    function sync() {
      if (!isActive()) {
        cancelFrame();
        runtime.current?.reset();
        return;
      }
      if (runtime.current) {
        runtime.current.resize();
        if (motion.matches) runtime.current.reset();
        invalidate();
      } else {
        void initialize();
      }
    }
    synchronize.current = sync;

    function contextLost(event: Event) { event.preventDefault(); fallback(); }
    function point(event: PointerEvent) {
      if (motion.matches || event.pointerType === "touch" || !isActive()) return;
      const bounds = element!.getBoundingClientRect();
      runtime.current?.point(
        Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1)),
        Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1)),
      );
      invalidate();
    }
    function reset() { runtime.current?.reset(); invalidate(); }

    const intersection = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      sync();
    }, { threshold: 0 });
    intersection?.observe(element);
    if (!intersection) visible = true;
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync);
    resize?.observe(element);
    const mutation = new MutationObserver(sync);
    ancestors.forEach(parent => mutation.observe(parent, { attributes: true, attributeFilter: ["hidden", "inert", "aria-hidden", "class", "style", "data-state"] }));
    surface.addEventListener("webglcontextlost", contextLost);
    element.addEventListener("pointermove", point, { passive: true });
    element.addEventListener("pointerleave", reset);
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("resize", sync);
    sync();

    return () => {
      disposed = true;
      abort.abort();
      cancelFrame();
      intersection?.disconnect();
      resize?.disconnect();
      mutation.disconnect();
      motion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("resize", sync);
      element.removeEventListener("pointermove", point);
      element.removeEventListener("pointerleave", reset);
      surface.removeEventListener("webglcontextlost", contextLost);
      runtime.current?.dispose();
      runtime.current = null;
      synchronize.current = () => {};
    };
  }, []);

  return <div ref={host} className={styles.trophy} aria-hidden="true" data-diana-weekly-trophy data-earned={earned} data-trophy-status={status}>
    <div className={styles.fallback} data-trophy-fallback>
      <svg className={styles.fallbackSymbol} viewBox="0 63 90 96" overflow="hidden" focusable="false">
        <defs>
          <linearGradient id={`${fallbackId}-pearl`} x1="0" y1=".7" x2="1" y2=".3">
            <stop stopColor="#ffa6de" />
            <stop offset=".48" stopColor="#a1b1df" />
            <stop offset=".85" stopColor="#86e9fb" />
            <stop offset="1" stopColor="#e4fcff" />
          </linearGradient>
          <mask id={`${fallbackId}-silhouette`} x="0" y="63" width="90" height="96" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }}>
            <image href={BRAND_SYMBOL} x="0" y="63" width="300" height="96" />
          </mask>
        </defs>
        <rect x="0" y="63" width="90" height="96" fill={`url(#${fallbackId}-pearl)`} mask={`url(#${fallbackId}-silhouette)`} />
      </svg>
      <span className={styles.fallbackPlinth} />
    </div>
    <canvas ref={canvas} className={styles.canvas} data-trophy-canvas />
  </div>;
}

export default DianaWeeklyTrophy;
