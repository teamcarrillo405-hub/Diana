import * as THREE from 'three';

function textPlate(text) {
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = '700 300px Outfit';
  const measure = probe.measureText(text);
  const aspect = (measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent + 30) / (measure.width + 60);
  const canvas = document.createElement('canvas');
  canvas.width = 4096; canvas.height = Math.ceil(canvas.width * aspect);
  const ctx = canvas.getContext('2d');
  const size = 300 * canvas.width / (measure.width + 60);
  ctx.font = `700 ${size}px Outfit`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const bounds = ctx.measureText(text);
  ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, canvas.width / 2, (canvas.height + bounds.actualBoundingBoxAscent - bounds.actualBoundingBoxDescent) / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return {texture, aspect};
}

export function makePixelScreen() {
  const phrases = ['HOMEWORK', 'THAT FITS', 'YOUR LIFE'].map(textPlate);
  const tutor = textPlate('YOUR  AI  TUTOR');
  const geometry = new THREE.PlaneGeometry(26.6, 40, 320, 1);
  const points = geometry.attributes.position;
  const coordinates = new Float32Array(points.count * 2);
  for (let i = 0; i < points.count; i++) {
    const arc = points.getX(i), y = points.getY(i), angle = arc / 9.5;
    points.setXYZ(i, 9.5 * Math.sin(angle), y, 9.5 * (1 - Math.cos(angle)));
    coordinates[i * 2] = arc; coordinates[i * 2 + 1] = y;
  }
  geometry.setAttribute('screenCoord', new THREE.BufferAttribute(coordinates, 2));
  geometry.computeVertexNormals();

  const uniforms = {
    uTime: {value: 0}, uPitch: {value: .045}, uMobile: {value: 0}, uSpan: {value: 18},
    uCopyBottom: {value: .25}, uCopyTop: {value: .88}, uIntensity: {value: .55},
    uHomework: {value: phrases[0].texture}, uFits: {value: phrases[1].texture}, uBottom: {value: phrases[2].texture},
    uAspects: {value: new THREE.Vector3(...phrases.map(p => p.aspect))},
    uOpening: {value: 1}, uTutor: {value: 0}, uTextCenter: {value: 0}, uTutorOffset: {value: new THREE.Vector2()},
    uTutorLine: {value: tutor.texture}, uTutorAspect: {value: tutor.aspect},
    uBrand: {value: null}, uBrandOpacity: {value: 1}, uBrandScreenToLocal: {value: new THREE.Matrix3()},
    uCyan: {value: new THREE.Color('#46cee2')}, uPink: {value: new THREE.Color('#f08abf')},
  };

  const material = new THREE.ShaderMaterial({
    uniforms, side: THREE.DoubleSide, toneMapped: false,
    vertexShader: `
      attribute vec2 screenCoord;
      varying vec2 vScreen;
      varying vec3 vNormal;
      varying vec4 vClip;
      void main() {
        vScreen = screenCoord;
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vClip = gl_Position;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uPitch;
      uniform float uMobile;
      uniform float uSpan;
      uniform float uCopyBottom;
      uniform float uCopyTop;
      uniform float uIntensity;
      uniform vec3 uAspects;
      uniform float uOpening;
      uniform float uTutor;
      uniform float uTextCenter;
      uniform vec2 uTutorOffset;
      uniform float uTutorAspect;
      uniform sampler2D uTutorLine;
      uniform sampler2D uBrand;
      uniform float uBrandOpacity;
      uniform mat3 uBrandScreenToLocal;
      uniform sampler2D uBottom;
      uniform sampler2D uHomework;
      uniform sampler2D uFits;
      uniform vec3 uCyan;
      uniform vec3 uPink;
      varying vec2 vScreen;
      varying vec3 vNormal;
      varying vec4 vClip;

      float glyph(sampler2D plate, vec2 p, float y, float width, float aspect, float travel, float period) {
        float x = mod(p.x + travel + period * 0.5, period) - period * 0.5;
        vec2 uv = vec2(x / width, (p.y - y) / (width * aspect)) + 0.5;
        if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return 0.0;
        return texture2D(plate, uv).r;
      }

      void main() {
        vec2 cell = vScreen / uPitch;
        vec2 center = (floor(cell) + 0.5) * uPitch;
        vec2 q = abs(fract(cell) - 0.5);
        float edge = max(q.x, q.y);
        float aa = max(fwidth(cell.x), fwidth(cell.y)) * 0.5;
        float emitter = 1.0 - smoothstep(0.32 - aa, 0.38 + aa, edge);
        float housing = 1.0 - smoothstep(0.44 - aa, 0.49 + aa, edge);

        // Sample content at fixed LED centers: only the light changes, not the pixel lattice.
        vec2 textPoint = center;
        textPoint.x += center.y * 0.14 * (1.0 - uMobile);
        float textMask = 0.0;
        if (uOpening > 0.0 && uMobile > 0.5) {
          float period = uSpan * 1.7;
          textMask = max(
            glyph(uHomework, textPoint, 2.4, uSpan * 0.84, uAspects.x, uTime / 40.0 * period, period),
            max(glyph(uFits, textPoint, 0.0, uSpan * 0.84, uAspects.y, -uTime / 48.0 * period, period),
                glyph(uBottom, textPoint, -2.4, uSpan * 0.84, uAspects.z, uTime / 44.0 * period, period))
          );
        } else if (uOpening > 0.0) {
          float period = 24.0;
          textMask = max(
            glyph(uHomework, textPoint, 3.6, 16.0, uAspects.x, uTime / 48.0 * period, period),
            max(glyph(uFits, textPoint, 0.0, 15.0, uAspects.y, -uTime / 56.0 * period, period),
                glyph(uBottom, textPoint, -3.6, 16.0, uAspects.z, uTime / 40.0 * period, period))
          );
        }

        float openingWidth = uMobile > 0.5 ? uSpan * 0.84 : 16.0;
        float tutorWidth = openingWidth * (uMobile > 0.5 ? 0.68 : 0.45);
        // The tutor line now holds in place while the timeline handles opacity.
        vec2 tutorPoint = center - uTutorOffset - vec2(0.0, uTextCenter);
        tutorPoint = mat2(1.0, 0.0, 0.0, 1.0) * tutorPoint;
        float tutorMask = 0.0;
        if (uTutor > 0.0) {
          tutorMask = glyph(uTutorLine, tutorPoint, 0.0, tutorWidth, uTutorAspect, 0.0, 90.0);
        }
        textMask *= uOpening;

        float phase = sin(uTime * 6.2831853 / 24.0);
        float saturation = pow(abs(phase), 0.8) * 0.94;
        float hue = smoothstep(-0.7, 0.7, center.x / max(uSpan, 6.0) * 0.7 - phase * 0.75);
        vec3 screenColor = mix(vec3(0.76, 0.8, 0.84), mix(uCyan, uPink, hue), saturation);
        float sweep = smoothstep(0.2, 0.85, 0.5 + 0.5 * sin(center.x * 0.55 + center.y * 0.16 - uTime * 0.3));
        float scan = 0.65 + 0.35 * sin(center.y * 0.8 + uTime * 0.16);
        float field = 0.009 + mix(0.012, 0.22, saturation) * sweep * scan;
        float facing = pow(abs(normalize(vNormal).z), 1.6);
        float falloff = mix(0.55, 1.0, facing);
        float screenY = 0.5 + 0.5 * vClip.y / vClip.w;
        float copySpace = smoothstep(uCopyBottom - 0.03, uCopyBottom + 0.22, screenY)
          * (1.0 - smoothstep(uCopyTop - 0.08, uCopyTop + 0.03, screenY));
        float light = uIntensity * mix(0.65, 1.0, copySpace);
        float mobileType = 1.0 - uMobile * (1.0 - smoothstep(0.05, 0.8, saturation)) * 0.4;
        float luminance = (field + textMask * mix(0.88, 0.13, saturation) * 0.38 * mobileType
          + tutorMask * uTutor * mix(0.7, 0.38, saturation)) * falloff * light;

        vec2 module = abs(fract(vScreen / 1.28 + 0.5) - 0.5);
        vec2 moduleAA = fwidth(vScreen / 1.28);
        float joint = 1.0 - min(smoothstep(0.007, 0.007 + moduleAA.x, module.x), smoothstep(0.007, 0.007 + moduleAA.y, module.y));
        vec3 color = vec3(0.0013, 0.0016, 0.0022);
        color += vec3(0.0012, 0.0015, 0.0018) * housing;
        color += screenColor * luminance * emitter;
        color = mix(color, vec3(0.003, 0.004, 0.005), joint * 0.94);
        if (uBrandOpacity > 0.0) {
          vec3 brandLocal = uBrandScreenToLocal * vec3(vClip.xy / vClip.w, 1.0);
          vec2 brandUV = brandLocal.xy / brandLocal.z + 0.5;
          if (all(greaterThanEqual(brandUV, vec2(0.0))) && all(lessThanEqual(brandUV, vec2(1.0)))) {
            color = mix(color, vec3(1.0), texture2D(uBrand, brandUV).a * uBrandOpacity);
          }
        }
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });

  return {mesh: new THREE.Mesh(geometry, material), uniforms};
}
