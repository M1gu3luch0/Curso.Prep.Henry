import * as THREE from 'three';
import { psxMaterial } from './psx.js';
import * as tex from './texturas.js';

export const FONDO = 0x1a1c2c;

// Centro del fogón grande (la olla y la bobina están aquí)
export const CENTRO = new THREE.Vector3(-0.45, 0, 0.05);

// En un fogón real la corriente oscila entre 20.000 y 100.000 veces por segundo.
// Aquí va a 0,5 Hz para poder verla.
const OMEGA = Math.PI;
export const corriente = (t) => Math.sin(OMEGA * t);

// La olla en corte deja abierto el cuarto que mira a la cámara (ángulos de -45° a 45°)
const CORTE_INI = Math.PI / 4;
const CORTE_LEN = Math.PI * 1.5;
const enHueco = (x, z, margen) => Math.abs(Math.atan2(x, z)) < Math.PI / 4 + margen;

// Perfiles (radio, altura) que se tornean para formar la olla y el agua
const PERFIL_BASE = [[0, 0], [0.58, 0], [0.62, 0.035], [0.62, 0.06], [0, 0.06]];
const PERFIL_PARED = [[0.62, 0.06], [0.62, 0.55], [0.6, 0.575], [0.58, 0.55], [0.58, 0.06]];
const PERFIL_AGUA = [[0, 0.06], [0.58, 0.06], [0.58, 0.45], [0, 0.45]];

// Líneas de campo: lazos alrededor del hilo de la bobina, en varios planos verticales
const ANGULOS_CAMPO = [-0.62, 0, 0.62, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2];
const TAMANOS_LAZO = [[0.13, 0.09], [0.22, 0.15], [0.3, 0.22]];
const PUNTOS_LAZO = 48;
const FLECHAS_POR_LAZO = 4;

const RADIOS_FOUCAULT = [0.16, 0.32, 0.48];
const FLECHAS_BOBINA = 80;
const BURBUJAS = 60;
const VAPORES = 14;

const COLOR_CORRIENTE = new THREE.Color(0xffe14a);
const COLOR_CAMPO_A = new THREE.Color(0x5ce0ff);
const COLOR_CAMPO_B = new THREE.Color(0xff5cc8);
const COLOR_FOUCAULT = new THREE.Color(0xff8a2a);

const GEO_FLECHA = new THREE.ConeGeometry(0.025, 0.07, 3);

function malla(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

function repetirUV(geo, rx, ry) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * rx, uv.getY(i) * ry);
  return geo;
}

class Espiral extends THREE.Curve {
  constructor(r0, r1, vueltas) {
    super();
    this.r0 = r0;
    this.r1 = r1;
    this.vueltas = vueltas;
    this.arcLengthDivisions = 2000;
  }

  getPoint(u, destino = new THREE.Vector3()) {
    const r = this.r0 + (this.r1 - this.r0) * u;
    const a = u * this.vueltas * Math.PI * 2;
    return destino.set(r * Math.cos(a), 0, r * Math.sin(a));
  }
}

function flechas(mat, cantidad) {
  const inst = new THREE.InstancedMesh(GEO_FLECHA, mat, cantidad);
  inst.frustumCulled = false;
  for (let i = 0; i < cantidad; i++) inst.setColorAt(i, COLOR_CORRIENTE);
  return inst;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _arriba = new THREE.Vector3(0, 1, 0);

function colocar(inst, i, pos, dir, escala, color) {
  _q.setFromUnitVectors(_arriba, dir);
  _s.setScalar(escala);
  _m.compose(pos, _q, _s);
  inst.setMatrixAt(i, _m);
  if (color) inst.setColorAt(i, color);
}

function crearCocina(scene) {
  const suelo = malla(repetirUV(new THREE.PlaneGeometry(12, 12, 6, 6), 6, 6), psxMaterial({ map: tex.suelo() }), 0, -0.9, 0);
  suelo.rotation.x = -Math.PI / 2;
  scene.add(suelo);

  // Muchas subdivisiones: así la deformación del mapeo afín no dobla tanto la pared
  scene.add(malla(repetirUV(new THREE.PlaneGeometry(10, 5, 24, 12), 10, 5), psxMaterial({ map: tex.azulejos() }), 0, 1.6, -1.2));

  // Muebles bajos: dejan hueco para la caja de la placa
  scene.add(malla(repetirUV(new THREE.BoxGeometry(5.2, 0.55, 2.1, 4, 1, 1), 4, 1), psxMaterial({ map: tex.mueble() }), 0, -0.625, -0.15));
  scene.add(malla(new THREE.BoxGeometry(5.2, 0.29, 0.04), psxMaterial({ color: 0xcfc8b6 }), 0, -0.205, 0.88));

  // Encimera de madera con el hueco de la placa (x de -1.1 a 1.1, z de -0.7 a 0.7)
  const matMadera = psxMaterial({ map: tex.madera() });
  for (const [x, z, w, d] of [[-1.85, -0.125, 1.5, 2.15], [1.85, -0.125, 1.5, 2.15], [0, -0.95, 2.2, 0.5], [0, 0.825, 2.2, 0.25]]) {
    scene.add(malla(repetirUV(new THREE.BoxGeometry(w, 0.06, d, 2, 1, 2), w, d), matMadera, x, -0.03, z));
  }

  // Decorado: una planta y un bote de utensilios
  scene.add(malla(new THREE.CylinderGeometry(0.12, 0.09, 0.2, 6), psxMaterial({ color: 0xb8643a }), 1.9, 0.1, -0.75));
  scene.add(malla(new THREE.IcosahedronGeometry(0.22, 0), psxMaterial({ color: 0x3f9a3a }), 1.9, 0.38, -0.75));
  scene.add(malla(new THREE.IcosahedronGeometry(0.14, 0), psxMaterial({ color: 0x56b84a }), 2.05, 0.52, -0.68));
  scene.add(malla(new THREE.CylinderGeometry(0.09, 0.09, 0.24, 6), psxMaterial({ color: 0x4a6ab8 }), -1.8, 0.12, -0.8));
  const matCuchara = psxMaterial({ color: 0xc8955a });
  for (const [dx, inc] of [[-0.03, -0.2], [0.02, 0.1], [0.04, 0.28]]) {
    const palo = malla(new THREE.BoxGeometry(0.025, 0.45, 0.025), matCuchara, -1.8 + dx, 0.3, -0.8);
    palo.rotation.z = inc;
    scene.add(palo);
  }
}

function crearPlaca(scene) {
  // Caja interior de la placa: BackSide para ver solo las paredes de dentro
  scene.add(malla(new THREE.BoxGeometry(2.2, 0.3, 1.4), psxMaterial({ color: 0x3a3a42, side: THREE.BackSide }), 0, -0.15, 0));

  // Ferritas: barras que dirigen el campo hacia arriba
  const matFerrita = psxMaterial({ color: 0x4a4850 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const f = malla(new THREE.BoxGeometry(0.4, 0.025, 0.05), matFerrita, CENTRO.x + Math.cos(a) * 0.34, -0.085, CENTRO.z + Math.sin(a) * 0.34);
    f.rotation.y = -a;
    scene.add(f);
  }

  // Bobinas de cobre en espiral
  const matCobre = psxMaterial({ map: tex.cobre() });
  const espiral = new Espiral(0.12, 0.55, 7);
  scene.add(malla(new THREE.TubeGeometry(espiral, 160, 0.022, 4, false), matCobre, CENTRO.x, -0.04, CENTRO.z));
  scene.add(malla(new THREE.TubeGeometry(new Espiral(0.07, 0.28, 4), 80, 0.02, 4, false), matCobre, 0.65, -0.04, -0.2));

  // Electrónica (inversor que genera la corriente de alta frecuencia)
  scene.add(malla(new THREE.BoxGeometry(0.75, 0.03, 1.1), psxMaterial({ map: tex.placa() }), 0.62, -0.27, 0.05));
  const matChip = psxMaterial({ color: 0x202024 });
  scene.add(malla(new THREE.BoxGeometry(0.12, 0.025, 0.12), matChip, 0.45, -0.243, 0.35));
  scene.add(malla(new THREE.BoxGeometry(0.12, 0.025, 0.12), matChip, 0.62, -0.243, 0.35));
  const matCondensador = psxMaterial({ color: 0x2a3a8a });
  scene.add(malla(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 6), matCondensador, 0.86, -0.195, 0.3));
  scene.add(malla(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 6), matCondensador, 0.86, -0.195, 0.45));
  scene.add(malla(new THREE.BoxGeometry(0.3, 0.08, 0.12), psxMaterial({ color: 0x9aa0a8 }), 0.55, -0.215, -0.15));
  const toroide = malla(new THREE.TorusGeometry(0.05, 0.02, 4, 8), matCobre, 0.8, -0.235, -0.3);
  toroide.rotation.x = Math.PI / 2;
  scene.add(toroide);

  const matVidrio = psxMaterial({ map: tex.vitro(), transparent: true });
  const vidrio = malla(new THREE.BoxGeometry(2.2, 0.03, 1.4), matVidrio, 0, 0.015, 0);
  scene.add(vidrio);

  return { vidrio, matVidrio, espiral };
}

function crearOlla(cortada, mats) {
  const grupo = new THREE.Group();
  const ini = cortada ? CORTE_INI : 0;
  const len = cortada ? CORTE_LEN : Math.PI * 2;
  const segmentos = cortada ? 9 : 12;
  const torno = (perfil) => new THREE.LatheGeometry(perfil.map(([x, y]) => new THREE.Vector2(x, y)), segmentos, ini, len);

  grupo.add(new THREE.Mesh(torno(PERFIL_BASE), mats.base));
  grupo.add(new THREE.Mesh(torno(PERFIL_PARED), mats.pared));
  grupo.add(malla(new THREE.CylinderGeometry(0.58, 0.58, 0.39, segmentos, 1, false, ini, len), mats.agua, 0, 0.255, 0));

  // Caras del corte, como en un dibujo técnico
  if (cortada) {
    for (const phi of [ini, ini + len]) {
      for (const [perfil, mat] of [[PERFIL_BASE, mats.corteBase], [PERFIL_PARED, mats.cortePared], [PERFIL_AGUA, mats.corteAgua]]) {
        const forma = new THREE.Shape(perfil.map(([x, y]) => new THREE.Vector2(x, y)));
        const tapa = new THREE.Mesh(new THREE.ShapeGeometry(forma), mat);
        tapa.rotation.y = phi - Math.PI / 2;
        grupo.add(tapa);
      }
    }
  }

  for (const lado of [-1, 1]) grupo.add(malla(new THREE.BoxGeometry(0.16, 0.05, 0.12), mats.asas, lado * 0.69, 0.47, 0));
  grupo.position.copy(CENTRO);
  return grupo;
}

export function crearMundo() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(FONDO);
  scene.fog = new THREE.Fog(FONDO, 5, 14);

  crearCocina(scene);
  const { vidrio, matVidrio, espiral } = crearPlaca(scene);

  const texAcero = tex.acero();
  const texAgua = tex.agua();
  const doble = THREE.DoubleSide;
  const matAgua = psxMaterial({ map: texAgua, opacity: 0.45, side: doble });
  const matCorteAgua = psxMaterial({ map: texAgua, lit: false, opacity: 0.45, side: doble });
  const acero = {
    base: psxMaterial({ map: texAcero, side: doble }),
    pared: psxMaterial({ map: texAcero, side: doble }),
    corteBase: psxMaterial({ color: 0xd4d8de, lit: false, side: doble }),
    cortePared: psxMaterial({ color: 0xd4d8de, lit: false, side: doble }),
    agua: matAgua,
    corteAgua: matCorteAgua,
    asas: psxMaterial({ color: 0x26262a }),
  };
  const matCristal = psxMaterial({ color: 0xbfe6ee, opacity: 0.35, side: doble });
  const matCorteCristal = psxMaterial({ color: 0xd8f4f8, lit: false, opacity: 0.5, side: doble });
  const cristal = {
    base: matCristal,
    pared: matCristal,
    corteBase: matCorteCristal,
    cortePared: matCorteCristal,
    agua: matAgua,
    corteAgua: matCorteAgua,
    asas: matCristal,
  };

  const ollas = {
    llena: crearOlla(false, acero),
    corte: crearOlla(true, acero),
    vidrio: crearOlla(true, cristal),
  };
  Object.values(ollas).forEach((o) => scene.add(o));

  const matFlecha = psxMaterial({ lit: false });

  // Corriente en la bobina
  const flechasBobina = flechas(matFlecha, FLECHAS_BOBINA);
  scene.add(flechasBobina);

  // Campo magnético
  const grupoCampo = new THREE.Group();
  grupoCampo.position.copy(CENTRO);
  scene.add(grupoCampo);
  const matLineaCampo = new THREE.LineBasicMaterial({ color: COLOR_CAMPO_A, transparent: true, depthWrite: false });
  const lazos = [];
  for (const phi of ANGULOS_CAMPO) {
    for (const [ar, ay] of TAMANOS_LAZO) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PUNTOS_LAZO * 3), 3));
      const linea = new THREE.LineLoop(geo, matLineaCampo);
      linea.frustumCulled = false;
      grupoCampo.add(linea);
      lazos.push({ phi, ar, ay, geo });
    }
  }
  const flechasCampo = flechas(matFlecha, lazos.length * FLECHAS_POR_LAZO);
  grupoCampo.add(flechasCampo);

  // Corrientes de Foucault en el fondo de la olla (solo en la parte no cortada)
  const grupoFoucault = new THREE.Group();
  grupoFoucault.position.set(CENTRO.x, 0.03 + 0.065, CENTRO.z);
  scene.add(grupoFoucault);
  const matLineaFoucault = new THREE.LineBasicMaterial({ color: COLOR_FOUCAULT, transparent: true, depthWrite: false });
  for (const r of RADIOS_FOUCAULT) {
    const puntos = [];
    for (let i = 0; i <= 36; i++) {
      const phi = CORTE_INI + (CORTE_LEN * i) / 36;
      puntos.push(new THREE.Vector3(r * Math.sin(phi), 0, r * Math.cos(phi)));
    }
    grupoFoucault.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(puntos), matLineaFoucault));
  }
  // Transparentes y con renderOrder alto: se dibujan después del agua y no quedan tapadas
  const flechasFoucault = flechas(psxMaterial({ lit: false, transparent: true }), RADIOS_FOUCAULT.reduce((n, r) => n + Math.round(r * 40), 0));
  grupoFoucault.add(flechasFoucault);
  grupoFoucault.children.forEach((hijo) => (hijo.renderOrder = 10));

  // Burbujas y vapor
  const burbujas = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), psxMaterial({ color: 0xd8f0ff }), BURBUJAS);
  burbujas.frustumCulled = false;
  scene.add(burbujas);
  const vapor = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    psxMaterial({ color: 0xffffff, lit: false, opacity: 0.22, side: doble }),
    VAPORES,
  );
  vapor.frustumCulled = false;
  scene.add(vapor);

  const estadoInicial = () => ({
    olla: 'llena', // 'llena' | 'corte' | 'vidrio' | 'ninguna'
    altoOlla: 0,
    altoVidrio: 0,
    rayosX: 0,
    corriente: 0,
    campo: 0,
    alturaCampo: 1,
    captura: 1,
    foucault: 0,
    calor: 0,
    hervor: 0,
    vapor: 0,
  });

  const mundo = { scene, estado: estadoInicial(), anclas: {} };

  mundo.reiniciar = () => {
    mundo.estado = estadoInicial();
  };

  const _p = new THREE.Vector3();
  const _p2 = new THREE.Vector3();
  const _dir = new THREE.Vector3();
  const _c = new THREE.Color();

  function puntoLazo(lazo, th, destino) {
    const e = mundo.estado;
    const r = 0.33 + lazo.ar * Math.cos(th);
    let y = -0.04 + lazo.ay * e.alturaCampo * Math.sin(th);
    y += (Math.min(y, 0.06) - y) * e.captura; // el acero "atrapa" el campo en su fondo
    y = Math.max(y, -0.1); // las ferritas lo cierran por debajo
    return destino.set(Math.sin(lazo.phi) * r, y, Math.cos(lazo.phi) * r);
  }

  mundo.actualizar = (t, camara) => {
    const e = mundo.estado;
    const I = corriente(t);
    const signo = I >= 0 ? 1 : -1;
    const avance = 1 - Math.cos(OMEGA * t); // desplazamiento acumulado: su derivada es la corriente

    // Olla, vidrio y rayos X
    for (const [nombre, grupo] of Object.entries(ollas)) {
      grupo.visible = e.olla === nombre;
      grupo.position.y = CENTRO.y + 0.03 + e.altoOlla;
    }
    vidrio.position.y = 0.015 + e.altoVidrio;
    matVidrio.uniforms.opacity.value = 1 - 0.75 * e.rayosX;

    // El fondo de acero se pone "al rojo" (exagerado para que se vea)
    for (const m of [acero.base, acero.corteBase]) m.uniforms.glow.value = 0.85 * e.calor;
    for (const m of [acero.pared, acero.cortePared]) m.uniforms.glow.value = 0.15 * e.calor;

    // Flechas amarillas: la corriente que recorre la bobina
    for (let i = 0; i < FLECHAS_BOBINA; i++) {
      const u = (((i / FLECHAS_BOBINA + 0.012 * avance) % 1) + 1) % 1;
      espiral.getPointAt(u, _p).add(CENTRO);
      _p.y = -0.012;
      espiral.getTangentAt(u, _dir).multiplyScalar(signo);
      _c.copy(COLOR_CORRIENTE).multiplyScalar(0.35 + 0.65 * Math.abs(I));
      colocar(flechasBobina, i, _p, _dir, e.corriente, _c);
    }
    flechasBobina.instanceMatrix.needsUpdate = true;
    flechasBobina.instanceColor.needsUpdate = true;

    // Campo magnético: cambia de sentido (y de color) con la corriente
    const colorCampo = signo > 0 ? COLOR_CAMPO_A : COLOR_CAMPO_B;
    grupoCampo.visible = e.campo > 0;
    matLineaCampo.color.copy(colorCampo);
    matLineaCampo.opacity = e.campo * (0.25 + 0.6 * Math.abs(I));
    let n = 0;
    for (const lazo of lazos) {
      const pos = lazo.geo.attributes.position;
      for (let i = 0; i < PUNTOS_LAZO; i++) {
        puntoLazo(lazo, (i / PUNTOS_LAZO) * Math.PI * 2, _p);
        pos.setXYZ(i, _p.x, _p.y, _p.z);
      }
      pos.needsUpdate = true;
      for (let k = 0; k < FLECHAS_POR_LAZO; k++) {
        const th = (k / FLECHAS_POR_LAZO) * Math.PI * 2 + 0.6 * avance;
        puntoLazo(lazo, th, _p);
        puntoLazo(lazo, th + 0.05, _p2);
        _dir.subVectors(_p2, _p).normalize().multiplyScalar(signo);
        _c.copy(colorCampo).multiplyScalar(0.4 + 0.6 * Math.abs(I));
        colocar(flechasCampo, n++, _p, _dir, e.campo * 0.9, _c);
      }
    }
    flechasCampo.instanceMatrix.needsUpdate = true;
    flechasCampo.instanceColor.needsUpdate = true;

    // Corrientes de Foucault: siguen a la variación del campo (desfasadas 90°)
    const variacion = -Math.cos(OMEGA * t);
    grupoFoucault.visible = e.foucault > 0;
    matLineaFoucault.opacity = e.foucault * (0.3 + 0.6 * Math.abs(variacion));
    n = 0;
    for (const r of RADIOS_FOUCAULT) {
      const cantidad = Math.round(r * 40);
      for (let k = 0; k < cantidad; k++) {
        const a = (k / cantidad) * Math.PI * 2 - 0.5 * Math.sin(OMEGA * t);
        _p.set(r * Math.cos(a), 0, r * Math.sin(a));
        _dir.set(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(variacion >= 0 ? 1 : -1);
        _c.copy(COLOR_FOUCAULT).multiplyScalar(0.45 + 0.55 * Math.abs(variacion));
        const visible = enHueco(_p.x, _p.z, 0.15) ? 0 : e.foucault;
        colocar(flechasFoucault, n++, _p, _dir, visible, _c);
      }
    }
    flechasFoucault.instanceMatrix.needsUpdate = true;
    flechasFoucault.instanceColor.needsUpdate = true;

    // Burbujas: salen del fondo caliente y suben
    const fondo = CENTRO.y + 0.03 + e.altoOlla + 0.07;
    for (let i = 0; i < BURBUJAS; i++) {
      const azar = Math.sin(i * 91.7) * 0.5 + 0.5;
      const azar2 = Math.sin(i * 47.3 + 1.3) * 0.5 + 0.5;
      const phi = CORTE_INI + 0.25 + azar * (CORTE_LEN - 0.5);
      const r = Math.sqrt(azar2) * 0.5;
      const f = (t * (0.5 + azar * 0.4) + azar2) % 1;
      const activa = i < BURBUJAS * e.hervor;
      _p.set(
        CENTRO.x + r * Math.sin(phi) + Math.sin(t * 7 + i) * 0.012,
        fondo + f * 0.34,
        CENTRO.z + r * Math.cos(phi),
      );
      _s.setScalar(activa ? 0.012 + f * 0.018 : 0);
      _m.compose(_p, _q.identity(), _s);
      burbujas.setMatrixAt(i, _m);
    }
    burbujas.instanceMatrix.needsUpdate = true;

    // Vapor: cuadrados que siempre miran a la cámara
    for (let i = 0; i < VAPORES; i++) {
      const f = (t * 0.22 + i / VAPORES) % 1;
      const ang = i * 2.4;
      _p.set(
        CENTRO.x + Math.cos(ang) * (0.15 + f * 0.25),
        fondo + 0.42 + f * 0.9,
        CENTRO.z + Math.sin(ang) * (0.15 + f * 0.25),
      );
      _s.setScalar(e.vapor * Math.sin(Math.PI * f) * (0.2 + f * 0.3));
      _m.compose(_p, camara.quaternion, _s);
      vapor.setMatrixAt(i, _m);
    }
    vapor.instanceMatrix.needsUpdate = true;

    // Puntos 3D a los que apuntan las etiquetas del HUD
    const yOlla = CENTRO.y + 0.03 + e.altoOlla;
    mundo.anclas = {
      olla: new THREE.Vector3(CENTRO.x + 0.5, yOlla + 0.38, CENTRO.z + 0.36),
      vidrio: new THREE.Vector3(0.95, 0.03 + e.altoVidrio, 0.62),
      bobina: new THREE.Vector3(CENTRO.x + 0.3, -0.04, CENTRO.z + 0.42),
      electronica: new THREE.Vector3(0.62, -0.25, 0.42),
    };
  };

  return mundo;
}
