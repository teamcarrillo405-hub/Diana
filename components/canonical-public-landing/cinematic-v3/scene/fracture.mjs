import * as THREE from 'three';

const smooth = THREE.MathUtils.smoothstep;
const random = seed => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};

export function fracturePose(progress, index, center) {
  const delay = random(index + 9) * .05;
  const travel = smooth(progress, .08 + delay, .82);
  const direction = Math.atan2(center.y, center.x);
  const distance = Math.pow(travel, 1.35) * (4.6 + random(index + 20) * 3.8);
  return {
    x: Math.cos(direction) * distance,
    y: Math.sin(direction) * distance - travel * travel * 1.3,
    z: travel * (2 + random(index + 40) * 6),
    rx: travel * (random(index + 50) - .5) * 3,
    ry: travel * (random(index + 60) - .5) * 4,
    rz: travel * (random(index + 70) - .5) * 2,
    opacity: 1 - smooth(travel, .5, .95),
    edge: smooth(progress, .035, .18) * (1 - smooth(travel, .42, .88)),
  };
}

export function fractureTriangles(aspect) {
  const count = 17;
  const radii = [.17, .49, 1.02, Math.hypot(aspect, 1) + .8];
  const center = new THREE.Vector2(aspect * .06, .025);
  const rings = radii.map((radius, row) => Array.from({length: count}, (_, i) => {
    const angle = i / count * Math.PI * 2 + (random(i + 1) - .5) * .11;
    const distance = radius * (row === 3 ? 1 : .84 + random(row * count + i + 99) * .32);
    return new THREE.Vector2(Math.cos(angle) * distance, Math.sin(angle) * distance).add(center);
  }));
  const triangles = [];
  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count;
    triangles.push([center, rings[0][i], rings[0][next]]);
    for (let row = 0; row < rings.length - 1; row++) {
      const a = rings[row][i], b = rings[row][next], c = rings[row + 1][i], d = rings[row + 1][next];
      triangles.push([a, c, d], [a, d, b]);
    }
  }
  return triangles;
}

export function makeFracture(texture, backdropTexture) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f1f3f0');
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 40);
  camera.position.z = 12;
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.MeshBasicMaterial({map: backdropTexture, transparent: true, opacity: 0, toneMapped: false, depthWrite: false}),
  );
  backdrop.position.z = -8;
  backdrop.renderOrder = -1;
  scene.add(backdrop);
  let pieces = [];
  return {
    resize(width, height) {
      const aspect = width / height;
      camera.left = -aspect; camera.right = aspect; camera.updateProjectionMatrix();
      backdrop.scale.x = aspect;
      const imageAspect = backdropTexture.image.width / backdropTexture.image.height;
      const cropX = Math.min(1, aspect / imageAspect);
      const cropY = Math.min(1, imageAspect / aspect);
      backdropTexture.repeat.set(cropX, cropY);
      backdropTexture.offset.set((1 - cropX) * (height > width ? .1 : .5), (1 - cropY) / 2);
      backdropTexture.needsUpdate = true;
      pieces.forEach(piece => piece.group.traverse(object => {object.geometry?.dispose(); object.material?.dispose();}));
      scene.clear();
      scene.add(backdrop);
      pieces = fractureTriangles(aspect).map((points, index) => {
        const center = points.reduce((sum, point) => sum.add(point), new THREE.Vector2()).multiplyScalar(1 / 3);
        const vertices = points.map(point => new THREE.Vector3(point.x - center.x, point.y - center.y, 0));
        const geometry = new THREE.BufferGeometry().setFromPoints(vertices);
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(points.flatMap(point => [point.x / (aspect * 2) + .5, point.y / 2 + .5]), 2));
        geometry.computeVertexNormals();
        const material = new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide, transparent: true, toneMapped: false});
        const face = new THREE.Mesh(geometry, material);
        const group = new THREE.Group(); group.add(face); group.position.set(center.x, center.y, 0);
        // A narrow bevel catches light along each actual fracture, rather than an overlay flash.
        const edge = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(vertices.map(v => v.clone().setZ(.004))), new THREE.LineBasicMaterial({color: '#dff7ff', transparent: true, opacity: 0}));
        group.add(edge);
        const sidePositions = [];
        for (let i = 0; i < 3; i++) {
          const a = vertices[i], b = vertices[(i + 1) % 3];
          sidePositions.push(a.x,a.y,0, b.x,b.y,0, b.x,b.y,-.024, a.x,a.y,0, b.x,b.y,-.024, a.x,a.y,-.024);
        }
        const sideGeometry = new THREE.BufferGeometry();
        sideGeometry.setAttribute('position', new THREE.Float32BufferAttribute(sidePositions, 3));
        const side = new THREE.Mesh(sideGeometry, new THREE.MeshBasicMaterial({color: '#81b5c7', side: THREE.DoubleSide, transparent: true, opacity: 0, toneMapped: false}));
        group.add(side); scene.add(group);
        return {group, material, edge, side, center, index};
      });
    },
    render(renderer, progress) {
      backdrop.material.opacity = smooth(progress, .24, .55);
      for (const piece of pieces) {
        const pose = fracturePose(progress, piece.index, piece.center);
        piece.group.position.set(piece.center.x + pose.x, piece.center.y + pose.y, pose.z);
        piece.group.rotation.set(pose.rx, pose.ry, pose.rz);
        piece.group.visible = pose.opacity > .001;
        piece.material.opacity = pose.opacity;
        piece.edge.material.opacity = pose.edge * .62;
        piece.side.material.opacity = pose.edge * .75;
      }
      renderer.render(scene, camera);
    },
  };
}
