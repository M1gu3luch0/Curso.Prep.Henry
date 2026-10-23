import * as THREE from 'three';
import { RES_X, RES_Y } from './psx.js';
import { crearMundo } from './escena.js';
import { ESCENAS, DURACION, buscarEscena } from './guion.js';
import { Hud } from './hud.js';

// La escena 3D se dibuja a 320x240 y luego se amplía sin suavizado
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(RES_X, RES_Y, false);

const pantalla = document.getElementById('pantalla');
const hud = new Hud(pantalla);
const camara = new THREE.PerspectiveCamera(50, RES_X / RES_Y, 0.05, 40);
const mundo = crearMundo();

const FUNDIDO = 0.4;

// Todo depende solo de t: el mismo t siempre da el mismo fotograma
function dibujar(t) {
  const { escena, local } = buscarEscena(t);
  const ctx = { mundo, camara, hud, t, local, dur: escena.dur };

  mundo.reiniciar();
  escena.estado(ctx);
  mundo.actualizar(t, camara);
  renderer.render(mundo.scene, camara);

  hud.componer(renderer.domElement);
  escena.hud?.(ctx);
  if (escena.texto) hud.dialogo(escena.texto, local);

  const entrada = escena === ESCENAS[0] ? 0.8 : FUNDIDO;
  hud.fundido(Math.max(1 - local / entrada, 1 - (escena.dur - local) / FUNDIDO, 0));
}

const parametros = new URLSearchParams(location.search);

if (parametros.has('captura')) {
  // Modo captura: render.mjs pide cada fotograma con su tiempo exacto
  await document.fonts.ready;
  window.DEMO = {
    listo: true,
    duracion: DURACION,
    capturar(t) {
      dibujar(t);
      return pantalla.toDataURL('image/png');
    },
  };
} else {
  // Modo reproducción: en bucle, en tiempo real. Clic = volver a empezar
  let inicio = performance.now() - Number(parametros.get('t') ?? 0) * 1000;
  pantalla.addEventListener('click', () => (inicio = performance.now()));
  renderer.setAnimationLoop(() => dibujar(((performance.now() - inicio) / 1000) % DURACION));
}
