import * as THREE from 'three';
import {createScreenFrame} from './frame.mjs';
import {productSlides} from './content.mjs';

export const slides = productSlides;

export function screenEntrance(stage) {
  const progress = THREE.MathUtils.clamp(stage, 0, 1);
  const travel = THREE.MathUtils.smoothstep(progress, .2, 1);
  const angle = .8 * (1 - travel);
  return {
    angle,
    yaw: angle * .5,
    y: -.45 * (1 - travel),
    opacity: progress,
    neighbors: THREE.MathUtils.smoothstep(progress, .78, 1),
  };
}

export function screenExit(progress) {
  const travel = THREE.MathUtils.smoothstep(progress, 0, .82);
  const angle = .8 * travel;
  return {
    angle, yaw: angle * .5, y: .18 * travel,
    opacity: 1 - THREE.MathUtils.smoothstep(progress, .4, .82),
  };
}

export function screenPose(stage, index, slide) {
  if (slide === 0 && index <= 0) return screenEntrance(stage);
  const local = index - slide;
  if (local > 0) return screenExit(local);
  return screenEntrance(THREE.MathUtils.smoothstep(1 + local, .42, 1));
}

export function screenCurvature(angle) {
  // Screens settle into a straight reading surface; the bend belongs only to travel between slides.
  return THREE.MathUtils.lerp(10_000, 1.15, THREE.MathUtils.smoothstep(Math.abs(angle), .02, .52));
}

export function detailMix(index, panelIndex, detailProgress) {
  const progress = panelIndex < index ? 1 : panelIndex === Math.round(index) ? detailProgress : 0;
  return THREE.MathUtils.smoothstep(progress, .32, .68);
}

export function setCurvature(geometry, ratio) {
  if (Math.abs((geometry.userData.curvature ?? 0) - ratio) < .0001) return;
  const width = geometry.userData.width;
  const vertices = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const direction = ratio < 0 ? -1 : 1;
  const radius = width * Math.abs(ratio);
  for (let i = 0; i < vertices.count; i++) {
    const angle = (uv.getX(i) - .5) * width / radius;
    vertices.setXYZ(i, radius * Math.sin(angle), vertices.getY(i), -direction * radius * (1 - Math.cos(angle)));
  }
  vertices.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.userData.curvature = ratio;
}

export function bend(width, height) {
  const geometry = new THREE.PlaneGeometry(width, height, 96, 1);
  geometry.userData.width = width;
  setCurvature(geometry, 1.15);
  return geometry;
}

export async function makeCarousel(renderer) {
  const loader = new THREE.TextureLoader();
  const group = new THREE.Group();
  const panels = [];
  for (const slide of slides) {
    const desktop = await loader.loadAsync(slide.image);
    const mobile = slide.mobileCrop ? desktop.clone() : slide.image === slide.mobile ? desktop : await loader.loadAsync(slide.mobile);
    const detailDesktop = slide.detailImage ? await loader.loadAsync(slide.detailImage) : null;
    const detailMobile = !detailDesktop || !slide.detailMobile || slide.detailImage === slide.detailMobile
      ? detailDesktop
      : await loader.loadAsync(slide.detailMobile);
    if (slide.mobileCrop) {
      const crop = slide.mobileCrop;
      mobile.repeat.set(crop.width, crop.height);
      mobile.offset.set(crop.x, 1 - crop.y - crop.height);
      mobile.needsUpdate = true;
    }
    for (const texture of [desktop, mobile, detailDesktop, detailMobile]) {
      if (!texture) continue;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    }
    const material = new THREE.MeshBasicMaterial({map: desktop, side: THREE.DoubleSide, toneMapped: false, transparent: true, opacity: 0});
    const mesh = new THREE.Mesh(bend(6, 3.375), material);
    const detailMaterial = detailDesktop
      ? new THREE.MeshBasicMaterial({map: detailDesktop, side: THREE.DoubleSide, toneMapped: false, transparent: true, opacity: 0})
      : null;
    const detailMesh = detailMaterial ? new THREE.Mesh(mesh.geometry, detailMaterial) : null;
    mesh.userData.slide = panels.length;
    const pivot = new THREE.Group();
    const frame = createScreenFrame(6, 3.375);
    mesh.position.z = .016;
    if (detailMesh) detailMesh.position.z = .018;
    pivot.add(mesh);
    if (detailMesh) pivot.add(detailMesh);
    pivot.add(frame.group);
    group.add(pivot); panels.push({mesh, detailMesh, pivot, frame, desktop, mobile, detailDesktop, detailMobile});
  }
  let mobileLayout = false, radius = 7.8, centerY = .4, centerZ = 2.2;
  let panelWidth = 6, panelHeight = 3.4;
  group.visible = false;

  function resize({width, height, copyTop, headerBottom}) {
    mobileLayout = width < 960 && width < height;
    const cameraDistance = 10.8 - centerZ;
    const visibleHeight = 2 * Math.tan(16 * Math.PI / 180) * cameraDistance;
    const visibleWidth = visibleHeight * width / height;
    const usableHeight = Math.max(140, copyTop - headerBottom - 56) / height * visibleHeight;
    panelWidth = mobileLayout ? visibleWidth * .86 : Math.min(visibleWidth * .87, usableHeight * 2.06);
    panelHeight = mobileLayout ? Math.min(usableHeight, panelWidth * 1.65) : panelWidth / 1.78;
    radius = panelWidth * 1.08;
    centerY = (.5 - (headerBottom + copyTop) / 2 / height) * visibleHeight;
    for (const panel of panels) {
      const slide = slides[panel.mesh.userData.slide];
      const cropActive = mobileLayout && width < 700 && slide.mobileCrop;
      const texture = mobileLayout && (!slide.mobileCrop || cropActive) ? panel.mobile : panel.desktop;
      const detailTexture = panel.detailDesktop
        ? (mobileLayout && panel.detailMobile ? panel.detailMobile : panel.detailDesktop)
        : null;
      const ratio = mobileLayout && cropActive ? texture.image.height / texture.image.width * (slide.mobileCrop.height / slide.mobileCrop.width) : 9 / 16;
      const w = Math.min(panelWidth, panelHeight / ratio);
      panel.mesh.geometry.dispose(); panel.mesh.geometry = bend(w, w * ratio);
      if (panel.detailMesh) panel.detailMesh.geometry = panel.mesh.geometry;
      panel.mesh.material.map = texture;
      if (panel.detailMesh && detailTexture) panel.detailMesh.material.map = detailTexture;
      panel.pivot.remove(panel.frame.group); panel.frame.dispose();
      panel.frame = createScreenFrame(w, w * ratio);
      panel.pivot.add(panel.frame.group);
    }
  }

  function update(stage, index, detailProgress = 0) {
    group.visible = stage > .001;
    panels.forEach(({mesh, detailMesh, pivot, frame}, i) => {
      const pose = screenPose(stage, index, i);
      const angle = pose.angle;
      // Keep full-sized screens on one carousel; perspective supplies the apparent growth.
      pivot.position.set(
        Math.sin(angle) * radius,
        centerY + pose.y,
        centerZ + radius * (Math.cos(angle) - 1),
      );
      pivot.rotation.set(0, angle + pose.yaw, 0);
      const detailOpacity = detailMesh ? detailMix(index, i, detailProgress) : 0;
      mesh.material.opacity = pose.opacity * (1 - detailOpacity);
      if (detailMesh) {
        detailMesh.material.opacity = pose.opacity * detailOpacity;
        detailMesh.visible = detailOpacity > .002;
      }
      const curvature = screenCurvature(angle);
      if (pose.opacity > .002) setCurvature(mesh.geometry, curvature);
      frame.update(pose.opacity, curvature);
      pivot.visible = pose.opacity > .002;
      mesh.material.color.setScalar(.68 + .32 * THREE.MathUtils.smoothstep(Math.cos(angle), .5, 1));
    });
  }
  return {group, resize, update, panels};
}
