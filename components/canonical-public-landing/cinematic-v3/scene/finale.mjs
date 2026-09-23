import * as THREE from 'three';

const gridShader = `
  uniform vec2 uResolution;
  uniform float uGridTravel;
  uniform vec3 uGray;
  float gridLine(vec2 p, float period) {
    vec2 cell = abs(fract(p / period - .5) - .5) * period;
    vec2 line = 1.0 - smoothstep(vec2(.25), max(fwidth(p), vec2(.7)), cell);
    return max(line.x, line.y);
  }
  vec3 grayGrid(vec2 uv) {
    vec2 p = (uv - .5) * uResolution;
    p.y += p.x * p.x / uResolution.x * .1;
    p.y -= uGridTravel;
    p.x += pow(p.x / uResolution.x, 3.0) * uResolution.x * .28;
    float pitch = uResolution.x < 700.0 ? 78.0 : 116.0;
    float lines = max(gridLine(p, pitch) * .2, gridLine(p, pitch * 4.0) * .32);
    float light = 1.0 + .035 * uv.y + .025 * sin(uv.x * 3.14159265) * uv.y * (1.0 - uv.y);
    return mix(uGray * light, vec3(.14, .17, .18), lines);
  }
`;
const fullscreenVertex = `varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, .999, 1.0); }`;

export function waveBoundary(progress, x) {
  return -.12 + 1.24 * progress
    + .035 * Math.sin(x * Math.PI * 1.4 + progress * 1.8)
    + .012 * Math.sin(x * Math.PI * 2 - progress * .8);
}

export function makeOutlineWave(symbol) {
  const maskScene = new THREE.Scene();
  maskScene.background = new THREE.Color('#000000');
  const mask = new THREE.Mesh(symbol.geometry, [
    new THREE.MeshBasicMaterial({color: '#ff0000', toneMapped: false}),
    new THREE.MeshBasicMaterial({color: '#00ff00', toneMapped: false}),
  ]);
  mask.matrixAutoUpdate = false; maskScene.add(mask);
  const target = new THREE.WebGLRenderTarget(1, 1, {depthBuffer: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter});
  target.samples = 4;
  const uniforms = {
    uMask: {value: target.texture}, uWave: {value: 0}, uTexel: {value: new THREE.Vector2(1, 1)},
    uPixelRatio: {value: 1}, uGray: {value: new THREE.Color('#c6cccd')}, uOutline: {value: new THREE.Color('#fcfdfd')},
    uResolution: {value: new THREE.Vector2(1, 1)}, uGridTravel: {value: 0}, uGlass: {value: 0},
  };
  // Match the scene background to the wave without baking a grid into the symbol material.
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms, depthWrite: false, depthTest: false, toneMapped: false,
    vertexShader: fullscreenVertex,
    fragmentShader: `varying vec2 vUv; ${gridShader}
      void main() {
        gl_FragColor = vec4(grayGrid(vUv), 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  backdrop.frustumCulled = false; backdrop.renderOrder = -10; backdrop.visible = false;
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform sampler2D uMask;
      uniform float uWave;
      uniform vec2 uTexel;
      uniform float uPixelRatio;
      uniform vec3 uOutline;
      uniform float uGlass;
      ${gridShader}
      varying vec2 vUv;
      void main() {
        float boundary = -.12 + 1.24 * uWave
          + .035 * sin(vUv.x * 3.14159265 * 1.4 + uWave * 1.8)
          + .012 * sin(vUv.x * 3.14159265 * 2.0 - uWave * .8);
        float coverage = 1.0 - smoothstep(boundary - uTexel.y, boundary + uTexel.y, vUv.y);
        if (coverage <= 0.0) discard;
        vec2 center = texture2D(uMask, vUv).rg;
        vec2 low = center;
        vec2 high = low;
        for (int x = -1; x <= 1; x++) {
          for (int y = -1; y <= 1; y++) {
            vec2 samplePoint = vUv + vec2(float(x), float(y)) * uTexel * uPixelRatio * 1.15;
            vec2 sampleMask = texture2D(uMask, samplePoint).rg;
            low = min(low, sampleMask); high = max(high, sampleMask);
          }
        }
        float edge = smoothstep(.12, .8, length(high - low));
        float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233))) * 43758.5453) - .5;
        float interior = clamp(center.r + center.g, 0.0, 1.0);
        vec3 gray = mix(grayGrid(vUv), uGray, interior * smoothstep(0.0, .05, uGlass)) + grain * .002;
        gl_FragColor = vec4(mix(gray, uOutline, edge * .92 * (1.0 - uGlass)), coverage * (1.0 - interior * uGlass));
        #include <colorspace_fragment>
      }
    `,
  });
  const overlay = new THREE.Scene();
  overlay.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  const overlayCamera = new THREE.Camera();
  return {
    backdrop,
    update(glass, time) {
      uniforms.uGlass.value = glass;
      // Keep the underlying scene grid gently alive instead of adding a second grid overlay.
      uniforms.uGridTravel.value = time * 6.5;
      backdrop.visible = glass > 0;
    },
    resize(width, height, pixelRatio) {
      target.setSize(Math.round(width * pixelRatio), Math.round(height * pixelRatio));
      uniforms.uTexel.value.set(1 / target.width, 1 / target.height);
      uniforms.uPixelRatio.value = pixelRatio;
      uniforms.uResolution.value.set(width, height);
    },
    render(renderer, scene, camera, progress) {
      if (progress <= 0) { renderer.render(scene, camera); return; }
      uniforms.uWave.value = progress;
      // Render the exact posed geometry as two lobe masks, retaining the visible overlap contour.
      symbol.updateWorldMatrix(true, false);
      mask.matrix.copy(symbol.matrixWorld); mask.visible = symbol.visible;
      const destination = renderer.getRenderTarget();
      renderer.setRenderTarget(target); renderer.render(maskScene, camera);
      renderer.setRenderTarget(destination); renderer.render(scene, camera);
      const autoClear = renderer.autoClear;
      renderer.autoClear = false; renderer.render(overlay, overlayCamera); renderer.autoClear = autoClear;
    },
  };
}
