import * as THREE from 'three';
import {createSymbol} from './solid-geometry.mjs';

export function makeEnvironment(renderer) {
  const room = new THREE.Scene();
  room.background = new THREE.Color('#34343e');
  function panel(color, strength, size, position) {
    const material = new THREE.MeshBasicMaterial({color: new THREE.Color(color).multiplyScalar(strength), side: THREE.DoubleSide});
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), material);
    mesh.position.set(...position); mesh.lookAt(0, 0, 0); room.add(mesh);
  }
  panel('#fbd4f0', 2.2, [.65, 7], [-4, 2, 5]);
  panel('#a9e8ff', 2.4, [.7, 8], [4, -1, 3]);
  panel('#ffffff', 2.4, [6, .65], [0, 5, 2]);
  panel('#eab5ec', 2.5, [2, 6], [-4, 0, -3]);
  panel('#b3ecff', 2, [4, .8], [1, -5, 1]);
  panel('#f0c6ef', 1.5, [8, 10], [-2, 1, 11]);
  panel('#ace9fb', 1.1, [5, 9], [5, 0, 9]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, .02, .1, 40);
  pmrem.dispose();
  for (const object of room.children) { object.geometry.dispose(); object.material.dispose(); }
  return environment;
}

export async function makeGlass() {
  const {geometry} = await createSymbol('resting');
  const rear = [], front = [];
  for (let i = 0; i < geometry.index.count; i += 3) {
    const a = geometry.index.getX(i), b = geometry.index.getX(i + 1), c = geometry.index.getX(i + 2);
    (geometry.attributes.aLobe.getX(a) < .5 ? rear : front).push(a, b, c);
  }
  geometry.setIndex([...rear, ...front]); geometry.clearGroups();
  geometry.addGroup(0, rear.length, 0); geometry.addGroup(rear.length, front.length, 1);
  for (const name of Object.keys(geometry.attributes)) if (!['position', 'normal'].includes(name)) geometry.deleteAttribute(name);
  const options = {color: '#ffffff', metalness: 0, roughness: .02, transmission: 1, thickness: 1.05, ior: 1.5, dispersion: .65, clearcoat: 1, clearcoatRoughness: .025, envMapIntensity: 1.3, attenuationDistance: 1.5, iridescence: .12, iridescenceIOR: 1.25, iridescenceThicknessRange: [140, 280]};
  const materials = [
    new THREE.MeshPhysicalMaterial({...options, attenuationColor: '#e5adeb'}),
    new THREE.MeshPhysicalMaterial({...options, attenuationColor: '#9ce0f3', attenuationDistance: 1.8}),
  ];
  for (const [i, material] of materials.entries()) {
    material.onBeforeCompile = shader => {
      shader.uniforms.uRimTint = {value: new THREE.Color(i ? '#a7e8fa' : '#efb9e9')};
      shader.fragmentShader = 'uniform vec3 uRimTint;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rim=pow(1.-abs(dot(normal,normalize(vViewPosition))),2.5);
        totalEmissiveRadiance+=uRimTint*rim*.18;
      `);
    };
  }
  return new THREE.Mesh(geometry, materials);
}

export function makeWordmark() {
  const plate = document.createElement('canvas'); plate.width = 4096; plate.height = 1024;
  const ctx = plate.getContext('2d'); ctx.font = '600 900px Outfit'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const size = 900 * 3900 / ctx.measureText('DIANA').width;
  ctx.font = `600 ${size}px Outfit`;
  const bounds = ctx.measureText('DIANA');
  ctx.fillStyle = '#ffffff';
  ctx.fillText('DIANA', 2048, (1024 + bounds.actualBoundingBoxAscent - bounds.actualBoundingBoxDescent) / 2);
  const texture = new THREE.CanvasTexture(plate); texture.colorSpace = THREE.SRGBColorSpace;
  // Opaque alpha-test lettering participates in Three.js's physical transmission pass.
  return new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({map: texture, alphaTest: .025, toneMapped: false, side: THREE.DoubleSide}));
}
