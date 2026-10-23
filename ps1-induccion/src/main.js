import * as THREE from 'three';
import { ESTILOS } from './estilos.js';
import { Contornos } from './cel.js';
import { configurarTexturas } from './texturas.js';
import { crearMundo } from './escena.js';
import { ESCENAS, DURACION, buscarEscena } from './guion.js';
import { Hud } from './hud.js';

const parametros = new URLSearchParams(location.search);
// ?estilo=cel para el cel-shading; por defecto, PS1
const estilo = ESTILOS[parametros.get('estilo')] ?? ESTILOS.ps1;
configurarTexturas(estilo.texturas);

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(estilo.ancho3d, estilo.alto3d, false);
const contornos = estilo.contornos ? new Contornos(renderer, estilo.ancho3d, estilo.alto3d) : null;

const pantalla = document.getElementById('pantalla');
const hud = new Hud(pantalla, estilo);
const camara = new THREE.PerspectiveCamera(50, estilo.ancho3d / estilo.alto3d, 0.05, 40);
const mundo = crearMundo(estilo);

const FUNDIDO = 0.4;

// Todo depende solo de t: el mismo t siempre da el mismo fotograma
function dibujar(t) {
  const { escena, local } = buscarEscena(t);
  const ctx = { mundo, camara, hud, estilo, t, local, dur: escena.dur };

  mundo.reiniciar();
  escena.estado(ctx);
  mundo.actualizar(t, camara);
  if (contornos) contornos.render(mundo.scene, camara);
  else renderer.render(mundo.scene, camara);

  hud.componer(renderer.domElement);
  escena.hud?.(ctx);
  if (escena.texto) hud.dialogo(escena.texto, local);

  const entrada = escena === ESCENAS[0] ? 0.8 : FUNDIDO;
  hud.fundido(Math.max(1 - local / entrada, 1 - (escena.dur - local) / FUNDIDO, 0));
}

if (parametros.has('captura')) {
  // Modo captura: render.mjs pide cada fotograma con su tiempo exacto
  await document.fonts.ready;
  window.DEMO = {
    listo: true,
    duracion: DURACION,
    ancho: pantalla.width,
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
