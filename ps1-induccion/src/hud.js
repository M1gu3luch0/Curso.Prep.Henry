// Capa 2D a 640x480 (el "modo alta resolución" de la PS1) sobre la imagen 3D de 320x240
export const HUD_X = 640;
export const HUD_Y = 480;

const FUENTE = '"DejaVu Sans Mono", "Courier New", monospace';

// Ritmo de la máquina de escribir (render.mjs lo usa también para los pitidos)
export const LETRAS_POR_SEGUNDO = 42;
export const RETRASO_TEXTO = 0.4;

export class Hud {
  constructor(canvas) {
    canvas.width = HUD_X;
    canvas.height = HUD_Y;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.medidor = document.createElement('canvas').getContext('2d');
    this.cache = new Map();
  }

  // Copia la imagen 3D ampliada sin suavizado
  componer(lienzo3d) {
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(lienzo3d, 0, 0, HUD_X, HUD_Y);
  }

  // Texto sin antialiasing: se dibuja aparte y se binariza el canal alfa
  rotulo(texto, tam, relleno) {
    const clave = `${tam}|${relleno}|${texto}`;
    let c = this.cache.get(clave);
    if (c) return c;
    if (this.cache.size > 4000) this.cache.clear();

    const fuente = `bold ${tam}px ${FUENTE}`;
    this.medidor.font = fuente;
    c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(this.medidor.measureText(texto).width) + 2);
    c.height = Math.ceil(tam * 1.35);
    const g = c.getContext('2d');
    g.font = fuente;
    g.textBaseline = 'top';
    if (relleno === 'oro') {
      const grad = g.createLinearGradient(0, 0, 0, c.height);
      grad.addColorStop(0.15, '#fff6a8');
      grad.addColorStop(0.55, '#ffc23a');
      grad.addColorStop(0.9, '#e0601a');
      g.fillStyle = grad;
    } else {
      g.fillStyle = relleno;
    }
    g.fillText(texto, 1, Math.round(tam * 0.12));
    const img = g.getImageData(0, 0, c.width, c.height);
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 100 ? 255 : 0;
    g.putImageData(img, 0, 0);
    this.cache.set(clave, c);
    return c;
  }

  texto(texto, x, y, { tam = 16, color = '#ffffff', borde = '#000000', alinear = 'left', grosor = 1 } = {}) {
    if (!texto) return;
    const c = this.rotulo(texto, tam, color);
    if (alinear === 'center') x -= c.width / 2;
    if (alinear === 'right') x -= c.width;
    x = Math.round(x);
    y = Math.round(y);
    if (borde) {
      const sombra = this.rotulo(texto, tam, borde);
      for (let dx = -grosor; dx <= grosor; dx++) {
        for (let dy = -grosor; dy <= grosor; dy++) {
          if (dx || dy) this.ctx.drawImage(sombra, x + dx, y + dy);
        }
      }
    }
    this.ctx.drawImage(c, x, y);
  }

  ancho(texto, tam = 16) {
    this.medidor.font = `bold ${tam}px ${FUENTE}`;
    return this.medidor.measureText(texto).width;
  }

  partirLineas(texto, anchoMax, tam = 16) {
    const lineas = [];
    let actual = '';
    for (const palabra of texto.split(' ')) {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (this.ancho(prueba, tam) > anchoMax && actual) {
        lineas.push(actual);
        actual = palabra;
      } else {
        actual = prueba;
      }
    }
    if (actual) lineas.push(actual);
    return lineas;
  }

  // Ventana azul con degradado y marco claro, al estilo de los RPG de la época
  ventana(x, y, w, h) {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#3346b8');
    g.addColorStop(1, '#0b1052');
    ctx.fillStyle = '#05061a';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = '#d8dcf0';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#7d84b0';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = g;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  }

  // Cuadro de diálogo con efecto máquina de escribir
  dialogo(texto, local, { y = 360, alto = 108 } = {}) {
    const x = 16;
    const w = HUD_X - 32;
    this.ventana(x, y, w, alto);
    const lineas = this.partirLineas(texto, w - 36);
    let quedan = Math.max(0, Math.floor((local - RETRASO_TEXTO) * LETRAS_POR_SEGUNDO));
    lineas.forEach((linea, i) => {
      const visible = linea.slice(0, Math.max(0, quedan));
      quedan -= linea.length + 1;
      this.texto(visible, x + 18, y + 14 + i * 22, { borde: '#0a0c30' });
    });
    if (quedan > 0 && Math.floor(local * 2.5) % 2 === 0) {
      this.texto('▼', x + w - 26, y + alto - 24, { color: '#ffe14a', borde: '#0a0c30' });
    }
  }

  // Etiqueta con línea que apunta a un punto 3D de la escena
  etiqueta(texto, punto3d, camara, dx, dy, aparicion) {
    if (aparicion <= 0) return;
    const v = punto3d.clone().project(camara);
    const px = Math.round(((v.x + 1) / 2) * HUD_X);
    const py = Math.round(((1 - v.y) / 2) * HUD_Y);
    const tx = px + dx;
    const ty = py + dy;
    const ctx = this.ctx;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.fillStyle = '#ffe14a';
    ctx.fillRect(px - 3, py - 3, 6, 6);
    const w = Math.ceil(this.ancho(texto, 14)) + 16;
    const bx = dx < 0 ? tx - w : tx;
    this.ventana(bx, ty - 12, w, 24);
    this.texto(texto, bx + 8, ty - 9, { tam: 14, borde: '#0a0c30' });
  }

  // Mini osciloscopio con la corriente de la bobina
  osciloscopio(t, corriente, { titulo = 'CORRIENTE EN LA BOBINA', x = 16, y = 16 } = {}) {
    const w = 220;
    const h = 84;
    const ctx = this.ctx;
    this.ventana(x, y, w, h);
    this.texto(titulo, x + 8, y + 5, { tam: 12, color: '#ffe14a', borde: '#0a0c30' });
    const cy = y + 52;
    ctx.fillStyle = '#5a64a8';
    ctx.fillRect(x + 8, cy, w - 16, 1);
    ctx.fillStyle = '#ffe14a';
    const historia = 4; // segundos que caben en la pantalla
    for (let i = 0; i <= w - 40; i++) {
      const ti = t - historia + (i / (w - 40)) * historia;
      ctx.fillRect(x + 12 + i, Math.round(cy - corriente(ti) * 22), 2, 2);
    }
    const yAhora = Math.round(cy - corriente(t) * 22);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + w - 30, yAhora - 3, 6, 6);
    this.texto('+', x + w - 18, y + 22, { tam: 12, borde: '#0a0c30' });
    this.texto('-', x + w - 18, y + 62, { tam: 12, borde: '#0a0c30' });
  }

  // Termómetro vertical
  termometro(etiqueta, grados, x, y) {
    const ctx = this.ctx;
    const alto = 150;
    this.ventana(x - 6, y - 6, 64, alto + 64);
    const k = Math.min(1, Math.max(0, (grados - 15) / 95));
    ctx.fillStyle = '#10142a';
    ctx.fillRect(x + 20, y + 20, 12, alto);
    const lleno = Math.round(alto * k);
    ctx.fillStyle = k > 0.6 ? '#ff4a2a' : k > 0.25 ? '#ffa030' : '#4ab0ff';
    ctx.fillRect(x + 20, y + 20 + alto - lleno, 12, lleno);
    ctx.fillRect(x + 16, y + 20 + alto, 20, 14);
    this.texto(etiqueta, x + 26, y, { tam: 12, alinear: 'center', borde: '#0a0c30' });
    this.texto(`${Math.round(grados)}°C`, x + 26, y + alto + 36, { tam: 12, alinear: 'center', color: '#ffe14a', borde: '#0a0c30' });
  }

  // Flecha hacia la derecha dibujada píxel a píxel
  flecha(x, y) {
    const ctx = this.ctx;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y - 1, 9, 3);
    for (let i = 0; i < 5; i++) ctx.fillRect(x + 8 + i, y - 4 + i, 1, 9 - 2 * i);
  }

  fundido(negro) {
    if (negro <= 0) return;
    // Fundido a negro por escalones, como en las consolas de la época
    this.ctx.fillStyle = `rgba(0, 0, 0, ${Math.round(negro * 8) / 8})`;
    this.ctx.fillRect(0, 0, HUD_X, HUD_Y);
  }
}
