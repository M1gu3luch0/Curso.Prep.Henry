import * as THREE from 'three';

// Resolución interna: la PS1 solía dibujar a 320x240
export const RES_X = 320;
export const RES_Y = 240;

// Dirección de la luz (en coordenadas del mundo) para la iluminación por vértice
const LUZ = new THREE.Vector3(0.4, 1, 0.7).normalize();

const vertexShader = /* glsl */ `
  #include <fog_pars_vertex>
  uniform vec2 resolution;
  uniform vec3 lightDir;
  uniform float lit;
  varying vec3 vAffineUv;
  varying vec3 vTint;

  void main() {
    vec4 local = vec4(position, 1.0);
    vec3 objNormal = normal;
    #ifdef USE_INSTANCING
      local = instanceMatrix * local;
      objNormal = mat3(instanceMatrix) * objNormal;
    #endif
    vec4 mvPosition = modelViewMatrix * local;
    vec4 clip = projectionMatrix * mvPosition;

    // 1) Vertex snapping: sin precisión subpíxel, los vértices saltan de píxel en píxel
    vec2 grid = resolution * 0.5;
    clip.xy = floor(clip.xy / clip.w * grid + 0.5) / grid * clip.w;
    gl_Position = clip;

    // 2) Mapeo afín: se multiplica por w aquí y se divide en el fragment shader
    vAffineUv = vec3(uv * clip.w, clip.w);

    // 3) Luz por vértice (Gouraud), nada de luz por píxel
    vec3 n = normalize(normalMatrix * objNormal);
    vec3 l = normalize((viewMatrix * vec4(lightDir, 0.0)).xyz);
    vTint = vec3(mix(1.0, 0.45 + 0.7 * max(dot(n, l), 0.0), lit));
    #ifdef USE_INSTANCING_COLOR
      vTint *= instanceColor;
    #endif

    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  #include <fog_pars_fragment>
  uniform sampler2D map;
  uniform float useMap;
  uniform vec3 color;
  uniform vec3 glowColor;
  uniform float glow;
  uniform float opacity;
  varying vec3 vAffineUv;
  varying vec3 vTint;

  // Matriz de Bayer 4x4 para el tramado (dithering)
  const float bayer[16] = float[16](
     0.0,  8.0,  2.0, 10.0,
    12.0,  4.0, 14.0,  6.0,
     3.0, 11.0,  1.0,  9.0,
    15.0,  7.0, 13.0,  5.0);

  void main() {
    vec4 tex = vec4(1.0);
    if (useMap > 0.5) tex = texture2D(map, vAffineUv.xy / vAffineUv.z);
    vec3 c = mix(tex.rgb * color * vTint, glowColor, glow);
    gl_FragColor = vec4(c, tex.a * opacity);
    #include <colorspace_fragment>
    #include <fog_fragment>

    // 4) Color de 15 bits (32 niveles por canal) con dithering
    ivec2 p = ivec2(mod(gl_FragCoord.xy, 4.0));
    float d = bayer[p.y * 4 + p.x] / 16.0 - 0.5;
    gl_FragColor.rgb = floor(gl_FragColor.rgb * 31.0 + 0.5 + d) / 31.0;
  }
`;

export function psxMaterial({
  map = null,
  color = 0xffffff,
  lit = true,
  opacity = 1,
  transparent = opacity < 1,
  side = THREE.FrontSide,
} = {}) {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      map: { value: null },
      useMap: { value: map ? 1 : 0 },
      color: { value: new THREE.Color(color) },
      glowColor: { value: new THREE.Color(0xff5a14) },
      glow: { value: 0 },
      opacity: { value: opacity },
      lit: { value: lit ? 1 : 0 },
      resolution: { value: new THREE.Vector2(RES_X, RES_Y) },
      lightDir: { value: LUZ },
    },
  ]);
  // Se asigna después de merge() para que la textura no se clone
  uniforms.map.value = map;

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    fog: true,
    side,
    transparent,
    depthWrite: !transparent,
  });
}
