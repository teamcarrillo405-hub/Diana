import * as THREE from 'three';

function contour(width, height, radius) {
  const path = new THREE.Path();
  const x = width / 2, y = height / 2;
  path.moveTo(-x + radius, -y);
  // Subdivide straight edges before bending the extruded frame into the screen's arc.
  for (let i = 1; i <= 64; i++) path.lineTo(-x + radius + (width - 2 * radius) * i / 64, -y);
  path.quadraticCurveTo(x, -y, x, -y + radius);
  path.lineTo(x, y - radius); path.quadraticCurveTo(x, y, x - radius, y);
  for (let i = 1; i <= 64; i++) path.lineTo(x - radius - (width - 2 * radius) * i / 64, y);
  path.quadraticCurveTo(-x, y, -x, y - radius);
  path.lineTo(-x, -y + radius); path.quadraticCurveTo(-x, -y, -x + radius, -y);
  path.closePath();
  return path;
}

function bendGeometry(geometry, radius, normals = false) {
  const direction = radius < 0 ? -1 : 1;
  radius = Math.abs(radius);
  const vertices = geometry.attributes.position;
  const rest = geometry.userData.rest ??= vertices.array.slice();
  for (let i = 0; i < vertices.count; i++) {
    const x = rest[i * 3], y = rest[i * 3 + 1], z = rest[i * 3 + 2];
    const angle = x / radius;
    vertices.setXYZ(i, (radius + z) * Math.sin(angle), y, -direction * radius * (1 - Math.cos(angle)) + z * Math.cos(angle));
  }
  vertices.needsUpdate = true;
  if (normals) geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

export function createScreenFrame(width, height) {
  const group = new THREE.Group();
  const border = THREE.MathUtils.clamp(width * .012, .026, .068);
  const depth = THREE.MathUtils.clamp(width * .027, .064, .15);
  const outer = contour(width + border * 2, height + border * 2, border * .8);
  const shape = new THREE.Shape(outer.getPoints(8));
  shape.holes.push(contour(width + .012, height + .012, .006));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, steps: 1, bevelEnabled: true, bevelSize: border * .2,
    bevelThickness: border * .2, bevelSegments: 3, curveSegments: 8,
  });
  geometry.translate(0, 0, -depth);
  const material = new THREE.MeshPhysicalMaterial({
    color: '#d9edf1', metalness: .08, roughness: .14, transmission: .72,
    thickness: depth, ior: 1.46, clearcoat: 1, clearcoatRoughness: .08,
    envMapIntensity: 1.6, transparent: true, opacity: 0, depthWrite: false,
    attenuationColor: '#c5e9ec', attenuationDistance: .65,
  });
  const body = new THREE.Mesh(geometry, material);
  group.add(body);
  const rims = [];
  for (const [z, color, opacity] of [[.008, '#edfaff', .6], [-depth, '#a6bdce', .32]]) {
    const points = outer.getPoints(8).map(point => new THREE.Vector3(point.x, point.y, z));
    const edge = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({color, transparent: true, opacity: 0, depthWrite: false}),
    );
    edge.userData.opacity = opacity; rims.push(edge); group.add(edge);
  }
  group.userData.dimensions = {width, height, border, depth};
  let curvature;
  function setCurvature(ratio) {
    if (Math.abs((curvature ?? 0) - ratio) < .0001) return;
    // Reuse flat rest coordinates so reverse scrolling cannot accumulate deformation.
    bendGeometry(geometry, width * ratio, true);
    rims.forEach(edge => bendGeometry(edge.geometry, width * ratio));
    curvature = ratio;
    group.userData.curvature = ratio;
  }
  setCurvature(1.15);
  return {
    group,
    update(opacity, ratio = 1.15) {
      if (opacity > .002) setCurvature(ratio);
      material.opacity = opacity * .94;
      rims.forEach(edge => { edge.material.opacity = opacity * edge.userData.opacity; });
    },
    dispose() {
      group.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
    },
  };
}
