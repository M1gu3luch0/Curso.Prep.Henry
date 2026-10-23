import * as THREE from 'three';

// Misma dirección de luz que el estilo PS1
const LUZ = new THREE.Vector3(0.4, 1, 0.7).normalize();

const vertexShader = /* glsl */ `
  #include <fog_pars_vertex>
  varying vec3 vNormalVista;
  varying vec3 vHaciaCamara;
  varying vec2 vUv;
  varying vec3 vColorInstancia;

  void main() {
    vec4 local = vec4(position, 1.0);
    vec3 objNormal = normal;
    #ifdef USE_INSTANCING
      local = instanceMatrix * local;
      objNormal = mat3(instanceMatrix) * objNormal;
    #endif
    vec4 mvPosition = modelViewMatrix * local;
    gl_Position = projectionMatrix * mvPosition;

    vNormalVista = normalize(normalMatrix * objNormal);
    vHaciaCamara = -mvPosition.xyz;
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
  uniform float brillo;
  uniform vec3 lightDir;
  varying vec3 vNormalVista;
  varying vec3 vHaciaCamara;
  varying vec2 vUv;
  varying vec3 vColorInstancia;

  void main() {
    vec4 tex = vec4(1.0);
    if (useMap > 0.5) tex = texture2D(map, vUv);
    vec3 base = tex.rgb * color * vColorInstancia;

    vec3 n = normalize(vNormalVista);
    if (!gl_FrontFacing) n = -n;
    vec3 l = normalize((viewMatrix * vec4(lightDir, 0.0)).xyz);
    float d = dot(n, l);

    // Tres tonos fijos en lugar de un degradado; las sombras tiran a azul
    vec3 tono = d > 0.45 ? vec3(1.0) : d > -0.1 ? vec3(0.8, 0.8, 0.92) : vec3(0.56, 0.56, 0.74);

    // Brillo especular "recortado": una mancha blanca de bordes duros
    vec3 h = normalize(l + normalize(vHaciaCamara));
    float reflejo = step(0.96, dot(n, h)) * brillo;

    vec3 c = mix(base, base * tono + reflejo * 0.55, lit);
    c = mix(c, glowColor, glow);
    gl_FragColor = vec4(c, tex.a * opacity);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

// Mismas opciones que psxMaterial, más "brillo" para los materiales metálicos o mojados
export function celMaterial({
  map = null,
  color = 0xffffff,
  lit = true,
  opacity = 1,
  transparent = opacity < 1,
  side = THREE.FrontSide,
  brillo = 0,
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
      brillo: { value: brillo },
      lightDir: { value: LUZ },
    },
  ]);
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

// Contornos de tinta: se detectan saltos de profundidad y de normal entre píxeles vecinos
const contornoShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    #include <packing>
    uniform sampler2D tColor;
    uniform sampler2D tNormal;
    uniform sampler2D tDepth;
    uniform vec2 texel;
    uniform float grosor;
    uniform float near;
    uniform float far;
    uniform vec3 colorTinta;
    varying vec2 vUv;

    float profundidad(vec2 uv) {
      return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, near, far);
    }

    vec3 normalEn(vec2 uv) {
      return texture2D(tNormal, uv).xyz * 2.0 - 1.0;
    }

    void main() {
      float d = profundidad(vUv);
      vec3 n = normalEn(vUv);
      float saltoProfundidad = 0.0;
      float saltoNormal = 0.0;
      for (int i = 0; i < 8; i++) {
        float a = float(i) * 0.7853982;
        vec2 uv = vUv + vec2(cos(a), sin(a)) * texel * grosor;
        saltoProfundidad = max(saltoProfundidad, abs(profundidad(uv) - d));
        saltoNormal = max(saltoNormal, 1.0 - dot(normalEn(uv), n));
      }
      float borde = max(
        smoothstep(0.03, 0.06, saltoProfundidad / d),
        smoothstep(0.3, 0.55, saltoNormal)
      );
      vec3 c = texture2D(tColor, vUv).rgb;
      gl_FragColor = vec4(mix(c, colorTinta, borde), 1.0);
      #include <colorspace_fragment>
    }
  `,
};

// Los transparentes no llevan contorno (salvo que estén opacos en ese momento o se pida)
const conContorno = (o) =>
  !o.userData.sinContorno &&
  (o.userData.contornoSiempre || !o.material.transparent || (o.material.uniforms?.opacity?.value ?? 1) >= 0.99);

export class Contornos {
  constructor(renderer, ancho, alto, { grosor = 1.6, tinta = 0x1d1d2b } = {}) {
    this.renderer = renderer;
    // Color con antialiasing (MSAA) y en sRGB para no perder precisión en los oscuros
    this.color = new THREE.WebGLRenderTarget(ancho, alto, { samples: 4 });
    this.color.texture.colorSpace = THREE.SRGBColorSpace;
    this.normales = new THREE.WebGLRenderTarget(ancho, alto, { depthTexture: new THREE.DepthTexture(ancho, alto) });
    this.materialesNormal = {};

    this.material = new THREE.ShaderMaterial({
      ...contornoShader,
      uniforms: {
        tColor: { value: this.color.texture },
        tNormal: { value: this.normales.texture },
        tDepth: { value: this.normales.depthTexture },
        texel: { value: new THREE.Vector2(1 / ancho, 1 / alto) },
        grosor: { value: grosor },
        near: { value: 0.1 },
        far: { value: 100 },
        colorTinta: { value: new THREE.Color(tinta) },
      },
      depthTest: false,
      depthWrite: false,
    });
    const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    pantalla.frustumCulled = false;
    this.escenaFinal = new THREE.Scene();
    this.escenaFinal.add(pantalla);
    this.camaraFinal = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  materialNormal(side) {
    this.materialesNormal[side] ??= new THREE.MeshNormalMaterial({ side });
    return this.materialesNormal[side];
  }

  render(escena, camara) {
    const r = this.renderer;

    // 1) La imagen en color
    r.setRenderTarget(this.color);
    r.render(escena, camara);

    // 2) Normales y profundidad, solo de lo que lleva contorno
    const cambios = [];
    escena.traverse((o) => {
      if (!o.visible) return;
      if (o.isLine || (o.isMesh && !conContorno(o))) {
        cambios.push([o, 'visible', true]);
        o.visible = false;
      } else if (o.isMesh) {
        cambios.push([o, 'material', o.material]);
        o.material = this.materialNormal(o.material.side);
      }
    });
    const fondo = escena.background;
    escena.background = null;
    r.setClearColor(0x000000, 1);
    r.setRenderTarget(this.normales);
    r.render(escena, camara);
    escena.background = fondo;
    for (const [o, propiedad, valor] of cambios) o[propiedad] = valor;

    // 3) Composición final: color + tinta
    this.material.uniforms.near.value = camara.near;
    this.material.uniforms.far.value = camara.far;
    r.setRenderTarget(null);
    r.render(this.escenaFinal, this.camaraFinal);
  }
}
