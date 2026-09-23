import * as THREE from 'three';

export function makeJewelFinish(symbol) {
  const original = symbol.material;
  const time = {value: 0};
  const palettes = [['#ed1597', '#6320d6'], ['#04dfec', '#075bc9']];
  const materials = palettes.map(([bright, deep], lobe) => {
    const material = new THREE.MeshPhysicalMaterial({
      color: '#ffffff', metalness: .55, roughness: .16,
      transmission: 0, transparent: false, opacity: 1,
      clearcoat: 1, clearcoatRoughness: .055, ior: 1.5,
      iridescence: .28, iridescenceIOR: 1.35,
      iridescenceThicknessRange: [180, 340], envMapIntensity: 1.05,
    });
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, {
        uJewelTime: time,
        uJewelBright: {value: new THREE.Color(bright)},
        uJewelDeep: {value: new THREE.Color(deep)},
        uJewelPhase: {value: lobe * 1.8},
      });
      shader.vertexShader = 'varying vec3 vJewelPosition;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nvJewelPosition = position;');
      shader.fragmentShader = `uniform float uJewelTime;
        uniform float uJewelPhase;
        uniform vec3 uJewelBright;
        uniform vec3 uJewelDeep;
        varying vec3 vJewelPosition;\n` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
        #include <color_fragment>
        float flow = .5 + .5 * sin(vJewelPosition.y * 1.9 + vJewelPosition.x * 1.2 - uJewelTime * .38 + uJewelPhase);
        diffuseColor.rgb *= mix(uJewelDeep, uJewelBright, smoothstep(.06, .94, flow));
      `);
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
        #include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * .055;
      `);
    };
    material.customProgramCacheKey = () => 'diana-opaque-jewel-v1';
    return material;
  });
  return {
    materials,
    update(progress, elapsed) {
      // Keep the approved opening; only the post-outline chapter gets the opaque finish.
      symbol.material = progress > 0 ? materials : original;
      time.value = elapsed;
      materials.forEach((material, index) => {
        material.envMapRotation.set(.06 * Math.sin(elapsed * .19), .22 * Math.sin(elapsed * .23 + index * .7), 0);
      });
    },
  };
}
