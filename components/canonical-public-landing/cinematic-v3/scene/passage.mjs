import * as THREE from 'three';
import {bend, setCurvature} from './carousel.mjs';
import {createScreenFrame} from './frame.mjs';
import {daySlides, dayStoryPose, gridDrift} from './day-story.mjs';
import {makeFracture} from './fracture.mjs';
import {assetPath} from './content.mjs';

const smooth = THREE.MathUtils.smoothstep;
const lerp = THREE.MathUtils.lerp;

export function passagePose(progress) {
  return {
    approach: smooth(progress, 0, .56),
    distortion: smooth(progress, .34, .56) * (1 - smooth(progress, .74, 1)),
    reveal: smooth(progress, .6, .96),
  };
}

export function dayPanelPose(progress) {
  const travel = smooth(progress, .12, 1);
  const angle = -.92 * (1 - travel);
  return {angle, yaw: angle * .68 - .16, y: -.3 * (1 - travel), opacity: smooth(progress, 0, .35), curvature: -lerp(1.18, 3.7, travel)};
}

export async function makePassage(renderer, environment) {
  const room = new THREE.Scene();
  room.background = new THREE.Color('#090b15'); room.environment = environment;
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 80);
  camera.position.set(0, .1, 11); camera.lookAt(0, 0, -2);
  const screen = new THREE.Scene();
  const screenCamera = new THREE.Camera();
  const originalTarget = new THREE.WebGLRenderTarget(1, 1, {type: THREE.HalfFloatType});
  const roomTarget = new THREE.WebGLRenderTarget(1, 1, {type: THREE.HalfFloatType});
  const fractureBackdrop = await new THREE.TextureLoader().loadAsync(assetPath('day-student.webp'));
  fractureBackdrop.colorSpace = THREE.SRGBColorSpace;
  const fracture = makeFracture(roomTarget.texture, fractureBackdrop);
  originalTarget.samples = 4; roomTarget.samples = 4;
  const compositeUniforms = {
    uOriginal: {value: originalTarget.texture}, uRoom: {value: roomTarget.texture},
    uReveal: {value: 0}, uDistort: {value: 0}, uProgress: {value: 0},
  };
  const composite = new THREE.ShaderMaterial({
    uniforms: compositeUniforms, depthTest: false, depthWrite: false, toneMapped: false,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: `
      uniform sampler2D uOriginal;
      uniform sampler2D uRoom;
      uniform float uReveal;
      uniform float uDistort;
      uniform float uProgress;
      varying vec2 vUv;
      vec2 lens(vec2 uv, float strength) {
        vec2 p = uv - .5;
        float radius = dot(p,p);
        p *= 1.0 + radius * strength * 1.5;
        p += strength * .025 * vec2(sin(p.y * 7. + uProgress * 6.), sin(p.x * 6. - uProgress * 5.));
        return clamp(.5 + p, .001, .999);
      }
      void main() {
        vec2 p = lens(vUv, uDistort);
        vec2 split = normalize(vUv - .5 + vec2(.0001)) * .004 * uDistort;
        vec3 front = vec3(texture2D(uOriginal, p + split).r, texture2D(uOriginal, p).g, texture2D(uOriginal, p - split).b);
        vec2 destination = lens(vUv, uDistort * .45);
        vec3 next = texture2D(uRoom, destination).rgb;
        gl_FragColor = vec4(mix(front, next, uReveal), 1.);
        #include <colorspace_fragment>
      }
    `,
  });
  screen.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), composite));

  const gridUniforms = {uTime: {value: 0}, uTravel: {value: 0}, uPaletteSpread: {value: 1}};
  const gridGeometry = new THREE.PlaneGeometry(46, 30, 192, 8);
  const vertices = gridGeometry.attributes.position;
  const coordinates = vertices.array.slice();
  gridGeometry.setAttribute('gridCoord', new THREE.BufferAttribute(coordinates, 3));
  for (let i = 0; i < vertices.count; i++) {
    const angle = vertices.getX(i) / 15;
    vertices.setXYZ(i, 15 * Math.sin(angle), vertices.getY(i), 15 * (1 - Math.cos(angle)));
  }
  gridGeometry.computeVertexNormals(); gridGeometry.computeBoundingSphere();
  const grid = new THREE.Mesh(gridGeometry, new THREE.ShaderMaterial({
    uniforms: gridUniforms, side: THREE.DoubleSide, toneMapped: false, depthWrite: false,
    vertexShader: `attribute vec3 gridCoord; varying vec2 vGrid;
      void main() { vGrid=gridCoord.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `
      uniform float uTime; uniform float uTravel; uniform float uPaletteSpread; varying vec2 vGrid;
      float lines(vec2 p,float spacing) {
        vec2 cell=abs(fract(p/spacing-.5)-.5)*spacing;
        vec2 ink=1.-smoothstep(vec2(.006), max(fwidth(p)*.9,vec2(.012)),cell);
        return max(ink.x,ink.y);
      }
      void main() {
        vec2 p=vGrid+vec2(uTravel,0.);
        float flow=p.x*.29*uPaletteSpread+p.y*.13-uTime*.07;
        float pink=pow(.5+.5*sin(flow),6.);
        float cyan=pow(.5+.5*sin(flow+2.6),6.);
        float blue=pow(.5+.5*sin(flow+4.5),6.);
        vec3 color=vec3(.004,.007,.016)
          +vec3(.16,.001,.045)*pink+vec3(.001,.08,.12)*cyan+vec3(.006,.01,.11)*blue;
        float fine=lines(p,1.1), major=lines(p,5.5);
        color=mix(color,vec3(.35,.52,.65),fine*.09+major*.04);
        gl_FragColor=vec4(color,1.);
        #include <colorspace_fragment>
      }
    `,
  }));
  grid.position.set(0, 0, -7); grid.rotation.set(.03, -.25, -.065); grid.renderOrder = -1; room.add(grid);
  const panels = await Promise.all(daySlides.map(async slide => {
    const texture = await new THREE.TextureLoader().loadAsync(slide.image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const image = new THREE.Mesh(bend(6, 3.375), new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide, transparent: true, opacity: 0, toneMapped: false}));
    image.position.z = .016;
    const group = new THREE.Group(); group.add(image); room.add(group);
    const frame = createScreenFrame(6, 3.375); group.add(frame.group);
    let video = null, videoTexture = null;
    if (slide.video && !slide.videoPending) {
      video = document.createElement('video');
      video.muted = true; video.loop = false; video.playsInline = true; video.preload = 'metadata';
      video.src = slide.video;
      videoTexture = new THREE.VideoTexture(video);
      videoTexture.colorSpace = THREE.SRGBColorSpace;
      video.addEventListener('loadeddata', () => { image.material.map = videoTexture; image.material.needsUpdate = true; });
      video.addEventListener('error', () => { image.material.map = texture; image.material.needsUpdate = true; });
    }
    return {group, image, frame, texture, video, playing: false, started: false, finished: false, lastProgressAt: 0, lastTime: 0};
  }));
  const light = new THREE.DirectionalLight('#e5f6ff', 2); light.position.set(3, 4, 7); room.add(light);
  let centerX = -2, centerY = 0, radius = 9, playback = false;
  let onVideoStart = () => {}, onVideoEnd = () => {};
  function finishVideo(panel, index) {
    panel.video?.pause();
    panel.playing = false;
    panel.finished = true;
    onVideoEnd(index);
  }
  panels.forEach((panel, index) => {
    panel.video?.addEventListener('ended', () => finishVideo(panel, index));
    panel.video?.addEventListener('error', () => finishVideo(panel, index));
  });
  function playVideo(panel, index) {
    panel.playing = true;
    panel.lastProgressAt = performance.now();
    panel.video.play().catch(() => finishVideo(panel, index));
  }
  return {
    setVideoCallbacks({onStart, onEnd}) {
      onVideoStart = onStart ?? onVideoStart;
      onVideoEnd = onEnd ?? onVideoEnd;
    },
    videoState() {
      return panels.map(panel => ({
        started: panel.started,
        finished: panel.finished,
        playing: panel.playing,
        duration: panel.video?.duration ?? 0,
        currentTime: panel.video?.currentTime ?? 0,
        paused: panel.video?.paused ?? true,
        angle: panel.group.rotation.y,
        opacity: panel.image.material.opacity,
      }));
    },
    setPlayback(enabled) {
      playback = enabled;
      panels.forEach((panel, index) => {
        if (!panel.started || panel.finished) return;
        if (!enabled) { panel.video.pause(); panel.playing = false; }
        else if (!panel.playing) playVideo(panel, index);
      });
    },
    cancelPlayback() {
      panels.forEach((panel, index) => {
        if (panel.started && !panel.finished) finishVideo(panel, index);
      });
    },
    prepare(originalCamera, symbol, motion) {
      const pose = passagePose(motion.dive);
      if (pose.approach > 0) {
        symbol.updateWorldMatrix(true, false);
        const destination = new THREE.Vector3(.6, -.45, .35).applyMatrix4(symbol.matrixWorld);
        const start = new THREE.Vector3(0, .12, 10.8);
        const close = destination.clone().add(new THREE.Vector3(0, 0, .7));
        originalCamera.position.copy(start.lerp(close, pose.approach));
        originalCamera.lookAt(new THREE.Vector3().lerp(destination, pose.approach));
      }
      return pose;
    },
    resize(width, height, pixelRatio) {
      for (const target of [originalTarget, roomTarget]) target.setSize(Math.round(width * pixelRatio), Math.round(height * pixelRatio));
      fracture.resize(width, height);
      camera.aspect = width / height; camera.updateProjectionMatrix();
      const h = 2 * Math.tan(19 * Math.PI / 180) * 11;
      const w = h * width / height;
      const portrait = width < 1000 && height > width;
      gridUniforms.uPaletteSpread.value = portrait ? 1.8 : 1;
      centerX = portrait ? 0 : -w * .18;
      centerY = portrait ? h * .08 : 0;
      radius = w * 1.25;
      for (const panel of panels) {
        const imageAspect = panel.texture.image.width / panel.texture.image.height;
        const maxHeight = h * (portrait ? .33 : .52);
        const panelWidth = Math.min(portrait ? w * .86 : w * .52, maxHeight * imageAspect);
        const imageHeight = panelWidth / imageAspect;
        panel.image.geometry.dispose(); panel.image.geometry = bend(panelWidth, imageHeight);
        panel.group.remove(panel.frame.group); panel.frame.dispose();
        panel.frame = createScreenFrame(panelWidth, imageHeight); panel.group.add(panel.frame.group);
      }
    },
    render(renderer, drawOriginal, motion, time) {
      if (motion.dive <= 0) { drawOriginal(); return; }
      const pose = passagePose(motion.dive);
      const emergence = smooth(motion.dive, .6, 1);
      const approach = smooth(motion.breach || 0, 0, .48);
      camera.position.set(lerp(-1.1, 0, emergence) + approach * .5, .1, lerp(lerp(8.8, 11, emergence), -3.5, approach));
      camera.lookAt(lerp(1, 0, emergence), 0, lerp(-2, -7, approach));
      camera.rotateZ(lerp(-.08, 0, emergence));
      for (const [index, panel] of panels.entries()) {
        const panelPose = dayStoryPose(motion.day, motion.dayIndex || 0, index);
        panel.group.visible = panelPose.opacity > .001 && !motion.breach;
        panel.group.position.set(centerX + Math.sin(panelPose.angle) * radius, centerY + panelPose.y, radius * (Math.cos(panelPose.angle) - 1));
        panel.group.rotation.set(0, panelPose.yaw, 0);
        panel.image.material.opacity = panelPose.opacity;
        if (panel.group.visible) setCurvature(panel.image.geometry, panelPose.curvature);
        panel.frame.update(panelPose.opacity, panelPose.curvature);
      }
      const activePanel = panels[motion.dayActive];
      const settled = motion.day >= .999 && Math.abs(motion.dayIndex - motion.dayActive) < .0001
        && motion.dayCopy > .999 && activePanel?.group.visible && Math.abs(activePanel.group.rotation.y) < .0001;
      if (playback && settled && activePanel?.video && !activePanel.started && !activePanel.finished) {
        activePanel.started = true;
        activePanel.video.currentTime = 0;
        // Lock before playback begins so continued wheel or touch input cannot move the frame underneath it.
        onVideoStart(motion.dayActive, motion.timelinePixels);
        playVideo(activePanel, motion.dayActive);
      }
      panels.forEach((panel, index) => {
        if (!panel.playing || !panel.video) return;
        if (panel.video.currentTime > panel.lastTime) {
          panel.lastTime = panel.video.currentTime;
          panel.lastProgressAt = performance.now();
        } else if (performance.now() - panel.lastProgressAt > 15000) finishVideo(panel, index);
      });
      gridUniforms.uTime.value = time; gridUniforms.uTravel.value = gridDrift(time);
      compositeUniforms.uReveal.value = pose.reveal;
      compositeUniforms.uDistort.value = pose.distortion;
      compositeUniforms.uProgress.value = motion.dive;
      const destination = renderer.getRenderTarget();
      if (pose.reveal < 1) { renderer.setRenderTarget(originalTarget); drawOriginal(); }
      renderer.setRenderTarget(roomTarget); renderer.render(room, camera);
      renderer.setRenderTarget(destination);
      if (motion.breach > .2) fracture.render(renderer, motion.breach);
      else renderer.render(screen, screenCamera);
    },
  };
}
