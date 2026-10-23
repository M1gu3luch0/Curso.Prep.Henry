// Banda sonora sintetizada (solo Node): colchón de acordes + pitidos al escribir el texto
import { LETRAS_POR_SEGUNDO, RETRASO_TEXTO } from './src/hud.js';

const FRECUENCIA = 44100;
const hz = (nota) => 440 * 2 ** ((nota - 69) / 12);

// Un acorde por escena (notas MIDI): La menor, Fa, Do, Sol...
const ACORDES = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];

export function bandaSonoraWav(escenas) {
  const duracion = escenas.reduce((total, e) => total + e.dur, 0);
  const n = Math.ceil(duracion * FRECUENCIA);
  const pista = new Float32Array(n);

  const sumar = (desde, hasta, onda) => {
    const a = Math.max(0, Math.floor(desde * FRECUENCIA));
    const b = Math.min(n, Math.ceil(hasta * FRECUENCIA));
    for (let s = a; s < b; s++) pista[s] += onda(s / FRECUENCIA - desde);
  };

  let inicio = 0;
  escenas.forEach((escena, i) => {
    const acorde = ACORDES[i % ACORDES.length];
    for (const nota of [...acorde, acorde[0] - 24]) {
      const f = hz(nota);
      const largo = escena.dur + 1;
      sumar(inicio, inicio + largo, (t) => {
        const envolvente = Math.min(1, t / 1.2, Math.max(0, (largo - t) / 1.5));
        return 0.03 * envolvente * (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * f * 2.004 * t));
      });
    }

    if (escena.texto) {
      for (let c = 0; c < escena.texto.length; c += 2) {
        if (escena.texto[c] === ' ') continue;
        const t0 = inicio + RETRASO_TEXTO + c / LETRAS_POR_SEGUNDO;
        const f = c % 4 === 0 ? 1568 : 1319;
        sumar(t0, t0 + 0.03, (t) => 0.05 * Math.exp(-t * 120) * Math.sign(Math.sin(2 * Math.PI * f * t)));
      }
    }
    inicio += escena.dur;
  });

  // Eco sencillo para dar ambiente
  const retardo = Math.floor(0.25 * FRECUENCIA);
  for (let s = retardo; s < n; s++) pista[s] += pista[s - retardo] * 0.3;

  // Fundido final y normalización
  const fundido = 1.5 * FRECUENCIA;
  for (let s = Math.max(0, n - fundido); s < n; s++) pista[s] *= (n - s) / fundido;
  const pico = pista.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  const ganancia = 0.7 / pico;

  // WAV mono de 16 bits
  const wav = Buffer.alloc(44 + n * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + n * 2, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(FRECUENCIA, 24);
  wav.writeUInt32LE(FRECUENCIA * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(n * 2, 40);
  for (let s = 0; s < n; s++) wav.writeInt16LE(Math.round(pista[s] * ganancia * 32767), 44 + s * 2);
  return wav;
}
