import * as THREE from 'three';

export async function createSymbol(name = 'geometry') {
  const base = globalThis.__DIANA_ASSET_BASE__;
  const asset = file => base ? `${String(base).replace(/\/$/, '')}/${file}` : `./${file}`;
  const [manifestResponse, binaryResponse] = await Promise.all([
    fetch(asset(`${name}.json`)),
    fetch(asset(`${name}.bin`)),
  ]);
  if (!manifestResponse.ok || !binaryResponse.ok) throw new Error('The Diana model could not load');
  const [manifest, buffer] = await Promise.all([manifestResponse.json(), binaryResponse.arrayBuffer()]);
  const geometry = new THREE.BufferGeometry();
  for (const [attributeName, attribute] of Object.entries(manifest.attributes)) {
    const array = attribute.type === 'Uint32'
      ? new Uint32Array(buffer, attribute.offset, attribute.length)
      : new Float32Array(buffer, attribute.offset, attribute.length);
    if (attributeName === 'index') geometry.setIndex(new THREE.BufferAttribute(array, 1));
    else geometry.setAttribute(attributeName, new THREE.BufferAttribute(array, attribute.itemSize));
  }
  geometry.computeBoundingSphere();
  return {geometry, count: manifest.fragments, planes: manifest.planes};
}
