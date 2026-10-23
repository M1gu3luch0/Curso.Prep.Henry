import * as THREE from 'three';

// Luz pensada para la vista isométrica: arriba claro, frente medio, lateral derecho oscuro
const LUZ = new THREE.Vector3(0.2, 1, 0.55).normalize();

const vertexShader = /* glsl */ `
  #include <fog_pars_vertex>
  varying vec3 vPosVista;
  varying vec2 vUv;
  varying vec3 vColorInstancia;

  void main() {
    vec4 local = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      local = instanceMatrix * local;
    #endif
    vec4 mvPosition = modelViewMatrix * local;
    gl_Position = projectionMatrix * mvPosition;
    vPosVista = -mvPosition.xyz;
    vUv = uv;
    vColorInstancia = vec3(1.0);
    #ifdef USE_INSTANCING_COLOR
      vColorInstancia = instanceColor;
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
  uniform float lit;
  uniform vec3 lightDir;
  varying vec3 vPosVista;
  varying vec2 vUv;
  varying vec3 vColorInstancia;

  void main() {
    vec4 tex = vec4(1.0);
    if (useMap > 0.5) tex = texture2D(map, vUv);
    vec3 base = tex.rgb * color * vColorInstancia;

    // Normal de la cara (no la suavizada): cada cara queda de un solo color, en facetas
    vec3 n = normalize(cross(dFdx(vPosVista), dFdy(vPosVista)));
    vec3 l = normalize((viewMatrix * vec4(lightDir, 0.0)).xyz);
    float k = clamp(dot(n, l) * 0.5 + 0.5, 0.0, 1.0);
    float tono = mix(0.72, 1.05, floor(k * 4.0 + 0.5) / 4.0);

    vec3 c = mix(base, base * tono, lit);
    c = mix(c, glowColor, glow);
    gl_FragColor = vec4(c, tex.a * opacity);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

// Mismas opciones que los otros estilos. Las texturas con un color "plano" asignado
// se sustituyen por ese color: la infografía va con colores lisos.
export function isoMaterial({
  map = null,
  color = 0xffffff,
  lit = true,
  opacity = 1,
  transparent = opacity < 1,
  side = THREE.FrontSide,
} = {}) {
  const plano = map?.userData.plano;
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      map: { value: null },
      useMap: { value: map && !plano ? 1 : 0 },
      color: { value: new THREE.Color(color) },
      glowColor: { value: new THREE.Color(0xff6b3d) },
      glow: { value: 0 },
      opacity: { value: opacity },
      lit: { value: lit ? 1 : 0 },
      lightDir: { value: LUZ },
    },
  ]);
  uniforms.map.value = plano ? null : map;
  if (plano) uniforms.color.value.multiply(new THREE.Color(plano));

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
