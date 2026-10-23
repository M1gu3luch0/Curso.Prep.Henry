import * as THREE from 'three';
import { ESTILOS } from './estilos.js';
import { Contornos } from './cel.js';
import { configurarTexturas } from './texturas.js';
import { crearMundo } from './escena.js';
import { ESCENAS, DURACION, buscarEscena } from './guion.js';
import { Hud } from './hud.js';

const parametros = new URLSearchParams(location.search);
// ?estilo=cel (cel-shading) o ?estilo=iso (infografía isométrica); por defecto, PS1
const estilo = ESTILOS[parametros.get('estilo')] ?? ESTILOS.ps1;
configurarTexturas(estilo.texturas);

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(estilo.ancho3d, estilo.alto3d, false);
const contornos = estilo.contornos ? new Contornos(renderer, estilo.ancho3d, estilo.alto3d, estilo.contornos) : null;

const pantalla = document.getElementById('pantalla');
const hud = new Hud(pantalla, estilo);
const aspecto = estilo.ancho3d / estilo.alto3d;
const camara = new THREE.PerspectiveCamera(50, aspecto, 0.05, 40);
const mundo = crearMundo(estilo);

// Estilo isométrico: cámara ortográfica con dirección fija (45° de giro, 35,26° de elevación).
// Cada escena del guion dice a qué punto mira, cuánto se ve (mitad de la altura visible, que
// cambia poco a poco) y a qué altura de la pantalla queda ese punto (centroY, de -1 a 1).
const camaraIso = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
const DIRECCION_ISO = new THREE.Vector3(1, 1, 1).normalize(); // vista isométrica clásica
const _objetivo = new THREE.Vector3();
const _arriba = new THREE.Vector3();
function encuadreIsometrico(escena, local) {
  const { objetivo, mitad: [desde, hasta], centroY = 0.25 } = escena.iso;
  const k = local / escena.dur;
  const mitad = desde + (hasta - desde) * k * k * (3 - 2 * k);
  Object.assign(camaraIso, { top: mitad, bottom: -mitad, left: -mitad * aspecto, right: mitad * aspecto });
  _objetivo.fromArray(objetivo);
  camaraIso.position.copy(_objetivo).addScaledVector(DIRECCION_ISO, 30);
  camaraIso.lookAt(_objetivo);
  // Se baja la cámara para que el punto quede más arriba y no lo tape el texto
  _arriba.set(0, 1, 0).applyQuaternion(camaraIso.quaternion);
  camaraIso.position.addScaledVector(_arriba, -centroY * mitad);
  camaraIso.updateProjectionMatrix();
  return camaraIso;
}

const FUNDIDO = 0.4;

// Todo depende solo de t: el mismo t siempre da el mismo fotograma
function dibujar(t) {
  const { escena, local } = buscarEscena(t);
  const ctx = { mundo, camara, hud, estilo, t, local, dur: escena.dur };

  mundo.reiniciar();
  escena.estado(ctx);
  // A partir de aquí (partículas, render y etiquetas) se usa la cámara que se ve
  if (estilo.isometrica) ctx.camara = encuadreIsometrico(escena, local);
  mundo.actualizar(t, ctx.camara);
  if (contornos) contornos.render(mundo.scene, ctx.camara);
  else renderer.render(mundo.scene, ctx.camara);

  hud.componer(renderer.domElement);
  escena.hud?.(ctx);
  if (escena.texto) hud.dialogo(escena.texto, local, { numero: ESCENAS.indexOf(escena), titulo: escena.titulo });

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
