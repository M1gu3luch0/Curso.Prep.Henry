import * as THREE from 'three';
import { CENTRO, corriente } from './escena.js';
import { HUD_X } from './hud.js';

const limitar = (x) => Math.min(1, Math.max(0, x));
const suave = (k) => k * k * (3 - 2 * k);
// Avance suavizado (0 → 1) entre los segundos a y b de la escena
const tramo = (local, a, b) => suave(limitar((local - a) / (b - a)));

const _desde = new THREE.Vector3();
const _hacia = new THREE.Vector3();

function travelling(camara, k, [desdeA, desdeB], [haciaA, haciaB]) {
  camara.position.lerpVectors(_desde.fromArray(desdeA), _hacia.fromArray(desdeB), k);
  camara.lookAt(_desde.fromArray(haciaA).lerp(_hacia.fromArray(haciaB), k));
}

function orbita(camara, centro, radio, altura, angulo) {
  camara.position.set(centro[0] + radio * Math.sin(angulo), centro[1] + altura, centro[2] + radio * Math.cos(angulo));
  camara.lookAt(centro[0], centro[1], centro[2]);
}

const C = [CENTRO.x, CENTRO.y, CENTRO.z];

export const ESCENAS = [
  {
    id: 'titulo',
    dur: 6,
    estado({ mundo, camara, local }) {
      Object.assign(mundo.estado, { hervor: 0.5, vapor: 0.8 });
      orbita(camara, [-0.3, 0.2, 0], 3, 1.5, 0.55 - local * 0.08);
    },
    hud({ hud, local }) {
      hud.texto('¿CÓMO FUNCIONA', HUD_X / 2, 92, { tam: 34, color: 'oro', grosor: 2, alinear: 'center' });
      hud.texto('UN FOGÓN DE INDUCCIÓN?', HUD_X / 2, 134, { tam: 34, color: 'oro', grosor: 2, alinear: 'center' });
      hud.texto('DEMO EDUCATIVA · ESTILO PS1', HUD_X / 2, 190, { tam: 14, alinear: 'center' });
      if (local > 1.2 && Math.floor(local * 2) % 2 === 0) {
        hud.texto('PULSA START', HUD_X / 2, 400, { tam: 20, alinear: 'center', grosor: 2 });
      }
    },
  },
  {
    id: 'exterior',
    dur: 8,
    texto: 'Por fuera, un fogón de inducción es solo una placa de vidrio lisa. No hay llama ni resistencias que se pongan al rojo.',
    estado({ camara, local, dur }) {
      travelling(camara, tramo(local, 0, dur), [[1.4, 1.3, 2.4], [0.6, 0.95, 1.8]], [[-0.35, 0.1, 0], [-0.4, 0.05, 0.05]]);
    },
  },
  {
    id: 'despiece',
    dur: 10,
    texto: 'Si lo desmontamos, bajo el vidrio aparece la pieza clave: una BOBINA de hilo de cobre enrollado en espiral, y la electrónica que la alimenta.',
    estado({ mundo, camara, local, dur }) {
      const k = tramo(local, 0.5, 3);
      Object.assign(mundo.estado, { altoVidrio: 0.6 * k, altoOlla: 1.15 * k });
      travelling(camara, tramo(local, 0, dur), [[1.5, 1.7, 3.5], [1.2, 1.55, 3.3]], [[-0.15, 0.62, 0], [-0.15, 0.62, 0]]);
    },
    hud({ hud, mundo, camara, local }) {
      const a = mundo.anclas;
      hud.etiqueta('OLLA DE ACERO', a.olla, camara, 70, -20, local - 3.2);
      hud.etiqueta('VIDRIO VITROCERÁMICO', a.vidrio, camara, -40, -40, local - 3.8);
      hud.etiqueta('BOBINA DE COBRE', a.bobina, camara, -60, -45, local - 4.4);
      hud.etiqueta('ELECTRÓNICA', a.electronica, camara, 60, -80, local - 5);
    },
  },
  {
    id: 'corriente',
    dur: 10,
    texto: 'La electrónica envía a la bobina corriente ALTERNA de alta frecuencia: cambia de sentido entre 20.000 y 100.000 veces por segundo. (Aquí, a cámara MUY lenta.)',
    estado({ mundo, camara, local, dur }) {
      Object.assign(mundo.estado, { olla: 'corte', altoOlla: 1.8, rayosX: 1, corriente: tramo(local, 0.3, 1.2) });
      travelling(camara, tramo(local, 0, dur), [[-0.45, 1.25, 1.35], [-0.45, 1.05, 1.1]], [[-0.45, -0.1, 0], [-0.45, -0.1, 0.02]]);
    },
    hud({ hud, t }) {
      hud.osciloscopio(t, corriente);
    },
  },
  {
    id: 'campo',
    dur: 10,
    texto: 'Esa corriente crea un CAMPO MAGNÉTICO que también cambia de sentido sin parar. El vidrio no lo frena: lo atraviesa y llega al fondo de la olla.',
    estado({ mundo, camara, local, dur }) {
      const alto = 1.6 * (1 - tramo(local, 3, 5.5));
      Object.assign(mundo.estado, {
        olla: 'corte',
        altoOlla: alto,
        rayosX: 1,
        corriente: 0.7,
        campo: tramo(local, 0.3, 1.5),
        alturaCampo: 1.6,
        captura: 1 - limitar(alto / 0.3),
      });
      // Primero de cerca; al bajar la olla, la cámara se aleja para verla entera
      travelling(camara, tramo(local, 2.5, 6), [[-0.1, 0.45, 1.35], [0.2, 0.8, 2]], [[-0.45, 0.05, 0.05], [-0.45, 0.22, 0.05]]);
    },
    hud({ hud, t }) {
      hud.osciloscopio(t, corriente);
    },
  },
  {
    id: 'foucault',
    dur: 10,
    texto: 'En el fondo de acero, ese campo variable INDUCE corrientes en remolino (de Foucault). El metal se resiste a ellas... y se CALIENTA.',
    estado({ mundo, camara, local, dur }) {
      Object.assign(mundo.estado, {
        olla: 'corte',
        rayosX: 1,
        corriente: 1,
        campo: 0.45,
        foucault: tramo(local, 0.8, 2),
        calor: 0.75 * tramo(local, 2, 9.5),
      });
      travelling(camara, tramo(local, 0, dur), [[-0.4, 1.5, 1.6], [-0.2, 1.35, 1.45]], [[-0.45, 0.0, 0.0], [-0.45, 0.0, 0.0]]);
    },
    hud({ hud, t, local }) {
      hud.osciloscopio(t, corriente);
      hud.termometro('OLLA', 20 + 50 * tramo(local, 2, 9.5), 500, 20);
      hud.termometro('VIDRIO', 20 + 6 * tramo(local, 4, 9.5), 568, 20);
    },
  },
  {
    id: 'hervir',
    dur: 9,
    texto: 'El calor nace dentro del propio fondo de la olla y pasa directo al agua. El vidrio solo se calienta por el contacto con la olla.',
    estado({ mundo, camara, local }) {
      Object.assign(mundo.estado, {
        olla: 'corte',
        rayosX: 1,
        corriente: 1,
        campo: 0.3,
        foucault: 0.6,
        calor: 0.75 + 0.25 * tramo(local, 0, 3),
        hervor: tramo(local, 0.5, 3.5),
        vapor: tramo(local, 1.5, 4.5),
      });
      orbita(camara, [C[0], 0.25, C[2]], 1.75, 0.75, 0.45 - local * 0.08);
    },
    hud({ hud, local }) {
      hud.termometro('OLLA', 70 + 30 * tramo(local, 0, 3.5), 500, 20);
      hud.termometro('VIDRIO', 26 + 19 * tramo(local, 0, 8), 568, 20);
    },
  },
  {
    id: 'vidrio',
    dur: 10,
    texto: 'Con una olla de vidrio (o de aluminio) no pasa nada: hace falta un fondo FERROMAGNÉTICO, de hierro o acero. Truco: si un imán se pega a la base, sirve.',
    estado({ mundo, camara, local, dur }) {
      Object.assign(mundo.estado, { olla: 'vidrio', rayosX: 1, corriente: 1, campo: 1, alturaCampo: 1.6, captura: 0 });
      travelling(camara, tramo(local, 0, dur), [[0.2, 0.75, 1.9], [0, 0.7, 1.75]], [[-0.45, 0.15, 0.05], [-0.45, 0.15, 0.05]]);
    },
    hud({ hud, t, local }) {
      hud.osciloscopio(t, corriente);
      hud.termometro('OLLA', 20, 500, 20);
      hud.termometro('VIDRIO', 20, 568, 20);
      if (local > 2.5 && Math.floor(local * 2.5) % 2 === 0) {
        hud.texto('¡NO SE CALIENTA!', 250, 135, { tam: 24, color: '#ff4a3a', grosor: 2, alinear: 'center' });
      }
    },
  },
  {
    id: 'resumen',
    dur: 11,
    texto: 'Por eso la inducción calienta tan rápido: el calor se genera directamente en la olla, no en la placa.',
    estado({ mundo, camara, local }) {
      Object.assign(mundo.estado, {
        olla: 'corte',
        rayosX: 1,
        corriente: 1,
        campo: 0.6,
        foucault: 0.8,
        calor: 1,
        hervor: 1,
        vapor: 1,
      });
      orbita(camara, [C[0] + 0.1, 0.15, C[2]], 2.3, 1.15, 0.55 - local * 0.09);
    },
    hud({ hud, local, dur }) {
      const pasos = [['CORRIENTE', 'ALTERNA'], ['CAMPO', 'MAGNÉTICO'], ['CORRIENTES', 'INDUCIDAS'], ['¡CALOR!', 'EN LA OLLA']];
      pasos.forEach(([l1, l2], i) => {
        if (local < 0.6 + i * 0.9) return;
        const x = 21 + i * 154;
        hud.ventana(x, 22, 136, 46);
        hud.texto(l1, x + 68, 27, { tam: 13, alinear: 'center', color: '#ffe14a', borde: '#0a0c30' });
        hud.texto(l2, x + 68, 46, { tam: 13, alinear: 'center', borde: '#0a0c30' });
        if (i > 0) hud.flecha(x - 16, 45);
      });
      if (local > dur - 3) hud.texto('FIN', HUD_X / 2, 160, { tam: 56, color: 'oro', grosor: 3, alinear: 'center' });
    },
  },
];

export const DURACION = ESCENAS.reduce((total, e) => total + e.dur, 0);

export function buscarEscena(t) {
  let inicio = 0;
  for (const escena of ESCENAS) {
    if (t < inicio + escena.dur) return { escena, local: t - inicio };
    inicio += escena.dur;
  }
  const ultima = ESCENAS[ESCENAS.length - 1];
  return { escena: ultima, local: ultima.dur };
}
