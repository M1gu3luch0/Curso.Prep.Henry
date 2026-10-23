import * as THREE from 'three';

// Generador pseudoaleatorio con semilla: las texturas salen iguales en cada render
function aleatorio(semilla) {
  return () => {
    semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// PS1: texturas diminutas, con ruido y sin filtrado ni mipmaps.
// Cel: el mismo dibujo a más resolución, limpio y suavizado.
let config = { escala: 1, ruido: true, suave: false };
export function configurarTexturas(opciones) {
  config = { ...config, ...opciones };
}

// plano: color liso que usa el estilo isométrico en lugar de la textura
function texturaCanvas(w, h, semilla, dibujar, plano) {
  const canvas = document.createElement('canvas');
  canvas.width = w * config.escala;
  canvas.height = h * config.escala;
  const ctx = canvas.getContext('2d');
  ctx.scale(config.escala, config.escala);
  dibujar(ctx, aleatorio(semilla), w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = config.suave ? THREE.LinearFilter : THREE.NearestFilter;
  tex.minFilter = config.suave ? THREE.LinearMipmapLinearFilter : THREE.NearestFilter;
  tex.generateMipmaps = config.suave;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (plano) tex.userData.plano = plano;
  return tex;
}

// Salpica cada píxel con un poco de ruido para que no quede plano
function ruido(ctx, w, h, rnd, fuerza) {
  if (!config.ruido) return;
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * fuerza;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

const rgb = (r, g, b) => `rgb(${r | 0}, ${g | 0}, ${b | 0})`;

export const madera = () =>
  texturaCanvas(64, 64, 1, (ctx, rnd, w, h) => {
    for (let y = 0; y < h; y += 16) {
      const tono = 125 + rnd() * 30;
      ctx.fillStyle = rgb(tono, tono * 0.64, tono * 0.36);
      ctx.fillRect(0, y, w, 16);
      ctx.fillStyle = 'rgba(70, 35, 12, 0.45)';
      for (let i = 0; i < 6; i++) {
        ctx.fillRect((rnd() * w) | 0, y + 1 + ((rnd() * 13) | 0), 6 + ((rnd() * 22) | 0), 1);
      }
      ctx.fillStyle = rgb(72, 42, 20);
      ctx.fillRect(0, y + 15, w, 1);
    }
    ruido(ctx, w, h, rnd, 16);
  }, '#e9b872');

export const azulejos = () =>
  texturaCanvas(64, 64, 2, (ctx, rnd, w, h) => {
    ctx.fillStyle = rgb(150, 160, 150);
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      for (let x = 0; x < w; x += 16) {
        const tono = 205 + rnd() * 25;
        ctx.fillStyle = rgb(tono * 0.86, tono * 0.95, tono * 0.9);
        ctx.fillRect(x + 1, y + 1, 15, 15);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(x + 2, y + 2, 5, 1);
      }
    }
    ruido(ctx, w, h, rnd, 10);
  }, '#dfeee9');

export const suelo = () =>
  texturaCanvas(64, 64, 3, (ctx, rnd, w, h) => {
    for (let y = 0; y < h; y += 32) {
      for (let x = 0; x < w; x += 32) {
        const par = (x + y) / 32 % 2 === 0;
        ctx.fillStyle = par ? rgb(150, 82, 58) : rgb(118, 62, 46);
        ctx.fillRect(x, y, 32, 32);
      }
    }
    ruido(ctx, w, h, rnd, 22);
  }, '#e8c4a0');

export const mueble = () =>
  texturaCanvas(64, 64, 4, (ctx, rnd, w, h) => {
    ctx.fillStyle = rgb(196, 188, 170);
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = rgb(150, 142, 126);
    ctx.fillRect(0, 0, 2, h);
    ctx.fillStyle = rgb(222, 216, 200);
    ctx.fillRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = rgb(206, 198, 182);
    ctx.fillRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = rgb(70, 70, 76);
    ctx.fillRect(w / 2 - 8, 12, 16, 3);
    ruido(ctx, w, h, rnd, 8);
  }, '#f6f1e7');

// Vitrocerámica: negra, con los aros de los fogones y los mandos táctiles
export const vitro = () =>
  texturaCanvas(192, 128, 5, (ctx, rnd, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, rgb(30, 30, 38));
    g.addColorStop(0.45, rgb(14, 14, 18));
    g.addColorStop(1, rgb(22, 22, 28));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(60, 0);
    ctx.lineTo(10, h);
    ctx.lineTo(-30, h);
    ctx.fill();

    // Aros de los fogones (fila 0 del canvas = borde frontal de la placa)
    ctx.strokeStyle = rgb(120, 120, 132);
    ctx.lineWidth = 1;
    for (const [x, y, r] of [[56.5, 59.5, 52], [56.5, 59.5, 47], [152.5, 82.5, 30]]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Mandos táctiles y piloto rojo
    ctx.fillStyle = rgb(150, 150, 160);
    for (let i = 0; i < 4; i++) ctx.fillRect(112 + i * 14, 6, 6, 2);
    ctx.fillRect(170, 4, 2, 6);
    ctx.fillStyle = rgb(255, 40, 30);
    ctx.fillRect(100, 4, 3, 6);
    ruido(ctx, w, h, rnd, 6);
  });

export const acero = () =>
  texturaCanvas(64, 64, 6, (ctx, rnd, w, h) => {
    ctx.fillStyle = rgb(160, 166, 174);
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) {
      const tono = 145 + rnd() * 40;
      ctx.fillStyle = `rgba(${tono | 0}, ${(tono + 4) | 0}, ${(tono + 10) | 0}, 0.6)`;
      ctx.fillRect(0, y, w, 1);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(0, 10, w, 4);
    ruido(ctx, w, h, rnd, 10);
  }, '#cfd8e3');

// El tubo de la bobina mapea "v" alrededor del hilo: franjas a lo largo del cobre
export const cobre = () =>
  texturaCanvas(16, 16, 7, (ctx, rnd, w, h) => {
    const franjas = [rgb(120, 52, 20), rgb(184, 98, 44), rgb(232, 150, 80), rgb(184, 98, 44)];
    franjas.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, i * 4, w, 4);
    });
    ruido(ctx, w, h, rnd, 14);
  }, '#e98a4f');

export const agua = () =>
  texturaCanvas(32, 32, 8, (ctx, rnd, w, h) => {
    ctx.fillStyle = rgb(40, 110, 180);
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = rgb(110, 175, 230);
    for (let i = 0; i < 10; i++) ctx.fillRect((rnd() * w) | 0, (rnd() * h) | 0, 3 + ((rnd() * 5) | 0), 1);
    ruido(ctx, w, h, rnd, 10);
  }, '#8ecae6');

export const placa = () =>
  texturaCanvas(64, 64, 9, (ctx, rnd, w, h) => {
    ctx.fillStyle = rgb(28, 110, 52);
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = rgb(120, 190, 90);
    for (let i = 0; i < 14; i++) {
      const x = (rnd() * w) | 0;
      const y = (rnd() * h) | 0;
      if (rnd() < 0.5) ctx.fillRect(x, y, 6 + ((rnd() * 20) | 0), 1);
      else ctx.fillRect(x, y, 1, 6 + ((rnd() * 20) | 0));
    }
    ctx.fillStyle = rgb(210, 190, 90);
    for (let i = 0; i < 16; i++) ctx.fillRect((rnd() * w) | 0, (rnd() * h) | 0, 2, 2);
    ruido(ctx, w, h, rnd, 10);
  });
