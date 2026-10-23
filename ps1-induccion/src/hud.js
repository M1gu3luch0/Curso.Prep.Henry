// Capa 2D de textos y ventanas. Se dibuja siempre en coordenadas de 640x480;
// en estilo cel el lienzo es el doble de grande y se escala.
export const HUD_X = 640;
export const HUD_Y = 480;

// Ritmo de la máquina de escribir (sonido.mjs lo usa también para los pitidos)
export const LETRAS_POR_SEGUNDO = 42;
export const RETRASO_TEXTO = 0.4;

const TEMAS = {
  // PS1: fuente monoespaciada sin antialiasing y ventanas azules de RPG
  psx: {
    pixel: true,
    fuente: '"DejaVu Sans Mono", "Courier New", monospace',
    peso: 'bold',
    texto: '#ffffff',
    textoLibre: '#ffffff',
    acento: '#ffe14a',
    alerta: '#ff4a3a',
    titulo: ['#fff6a8', '#ffc23a', '#e0601a'],
    borde: '#0a0c30', // contorno del texto dentro de las ventanas
    bordeLibre: '#000000', // contorno del texto sobre la escena
    linea: '#ffffff',
    punto: '#ffe14a',
    eje: '#5a64a8',
    tubo: '#10142a',
    frio: '#4ab0ff',
    tibio: '#ffa030',
    caliente: '#ff4a2a',
  },
  // Cel: fuente gruesa con antialiasing y bocadillos blancos con trazo de tinta
  cel: {
    pixel: false,
    fuente: 'Inter, "DejaVu Sans", sans-serif',
    peso: '800',
    texto: '#1d1d2b',
    textoLibre: '#ffffff',
    acento: '#e8590c',
    alerta: '#f03e3e',
    titulo: ['#fff3bf', '#ffd43b', '#ff922b'],
    borde: null,
    bordeLibre: '#1d1d2b',
    linea: '#1d1d2b',
    punto: '#ff922b',
    eje: '#ced4da',
    tubo: '#e9ecef',
    frio: '#4dabf7',
    tibio: '#ffa94d',
    caliente: '#f03e3e',
  },
};

export class Hud {
  constructor(canvas, estilo) {
    this.tema = TEMAS[estilo.tema];
    canvas.width = HUD_X * estilo.escalaHud;
    canvas.height = HUD_Y * estilo.escalaHud;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.scale(estilo.escalaHud, estilo.escalaHud);
    this.medidor = document.createElement('canvas').getContext('2d');
    this.cache = new Map();
  }

  fuente(tam) {
    return `${this.tema.peso} ${tam}px ${this.tema.fuente}`;
  }

  degradado(ctx, colores, y, alto) {
    const g = ctx.createLinearGradient(0, y, 0, y + alto);
    colores.forEach((c, i) => g.addColorStop(0.15 + i * 0.375, c));
    return g;
  }

  // Copia la imagen 3D (en PS1 se amplía sin suavizado)
  componer(lienzo3d) {
    this.ctx.imageSmoothingEnabled = !this.tema.pixel;
    this.ctx.drawImage(lienzo3d, 0, 0, HUD_X, HUD_Y);
  }

  // PS1: texto sin antialiasing, se dibuja aparte y se binariza el canal alfa
  rotulo(texto, tam, relleno) {
    const clave = `${tam}|${relleno}|${texto}`;
    let c = this.cache.get(clave);
    if (c) return c;
    if (this.cache.size > 4000) this.cache.clear();

    this.medidor.font = this.fuente(tam);
    c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(this.medidor.measureText(texto).width) + 2);
    c.height = Math.ceil(tam * 1.35);
    const g = c.getContext('2d');
    g.font = this.fuente(tam);
    g.textBaseline = 'top';
    g.fillStyle = Array.isArray(relleno) ? this.degradado(g, relleno, 0, c.height) : relleno;
    g.fillText(texto, 1, Math.round(tam * 0.12));
    const img = g.getImageData(0, 0, c.width, c.height);
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 100 ? 255 : 0;
    g.putImageData(img, 0, 0);
    this.cache.set(clave, c);
    return c;
  }

  // color: 'texto', 'acento', 'alerta', 'titulo' o un color CSS.
  // contorno: texto suelto sobre la escena (no dentro de una ventana).
  texto(texto, x, y, { tam = 16, color = 'texto', alinear = 'left', grosor = 1, contorno = false } = {}) {
    if (!texto) return;
    const t = this.tema;
    const relleno = t[contorno && color === 'texto' ? 'textoLibre' : color] ?? color;
    const borde = contorno ? t.bordeLibre : t.borde;
    const ctx = this.ctx;

    if (!t.pixel) {
      ctx.font = this.fuente(tam);
      ctx.textBaseline = 'top';
      ctx.textAlign = alinear;
      if (borde) {
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3 * grosor + 1;
        ctx.strokeStyle = borde;
        ctx.strokeText(texto, x, y);
      }
      ctx.fillStyle = Array.isArray(relleno) ? this.degradado(ctx, relleno, y, tam) : relleno;
      ctx.fillText(texto, x, y);
      ctx.textAlign = 'left';
      return;
    }

    const c = this.rotulo(texto, tam, relleno);
    if (alinear === 'center') x -= c.width / 2;
    if (alinear === 'right') x -= c.width;
    x = Math.round(x);
    y = Math.round(y);
    if (borde) {
      const sombra = this.rotulo(texto, tam, borde);
      for (let dx = -grosor; dx <= grosor; dx++) {
        for (let dy = -grosor; dy <= grosor; dy++) {
          if (dx || dy) ctx.drawImage(sombra, x + dx, y + dy);
        }
      }
    }
    ctx.drawImage(c, x, y);
  }

  ancho(texto, tam = 16) {
    this.medidor.font = this.fuente(tam);
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

  // PS1: ventana azul con degradado y marco claro. Cel: bocadillo blanco con sombra de tinta
  ventana(x, y, w, h) {
    const ctx = this.ctx;
    if (!this.tema.pixel) {
      const radio = Math.min(12, h / 2);
      ctx.fillStyle = this.tema.linea;
      ctx.beginPath();
      ctx.roundRect(x + 4, y + 5, w, h, radio);
      ctx.fill();
      ctx.fillStyle = '#fffaf0';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radio);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = this.tema.linea;
      ctx.stroke();
      return;
    }
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

  // Título de la portada; en cel entra con un pequeño rebote
  titulo(lineas, local) {
    let k = 1;
    if (!this.tema.pixel) {
      const s = Math.min(1, local / 0.7) - 1;
      k = 1 + 2.70158 * s ** 3 + 1.70158 * s ** 2;
    }
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(HUD_X / 2, 120);
    ctx.scale(k, k);
    lineas.forEach((linea, i) => {
      this.texto(linea, 0, -28 + i * 42, { tam: 34, color: 'titulo', grosor: 2, alinear: 'center', contorno: true });
    });
    ctx.restore();
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
      this.texto(visible, x + 18, y + 14 + i * 22);
    });
    if (quedan > 0 && Math.floor(local * 2.5) % 2 === 0) {
      this.texto('▼', x + w - 26, y + alto - 24, { color: 'acento' });
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
    ctx.strokeStyle = this.tema.linea;
    ctx.lineWidth = this.tema.pixel ? 2 : 3;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.fillStyle = this.tema.punto;
    if (this.tema.pixel) {
      ctx.fillRect(px - 3, py - 3, 6, 6);
    } else {
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    const w = Math.ceil(this.ancho(texto, 14)) + 16;
    const bx = dx < 0 ? tx - w : tx;
    this.ventana(bx, ty - 12, w, 24);
    this.texto(texto, bx + 8, ty - 9, { tam: 14 });
  }

  // Mini osciloscopio con la corriente de la bobina
  osciloscopio(t, corriente, { titulo = 'CORRIENTE EN LA BOBINA', x = 16, y = 16 } = {}) {
    const w = 220;
    const h = 84;
    const ctx = this.ctx;
    this.ventana(x, y, w, h);
    this.texto(titulo, x + 8, y + 5, { tam: 12, color: 'acento' });
    const cy = y + 52;
    ctx.fillStyle = this.tema.eje;
    ctx.fillRect(x + 8, cy, w - 16, 1);
    const historia = 4; // segundos que caben en la pantalla
    const ancho = w - 40;
    const yEn = (i) => cy - corriente(t - historia + (i / ancho) * historia) * 22;
    if (this.tema.pixel) {
      ctx.fillStyle = this.tema.acento;
      for (let i = 0; i <= ancho; i++) ctx.fillRect(x + 12 + i, Math.round(yEn(i)), 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + w - 30, Math.round(yEn(ancho)) - 3, 6, 6);
    } else {
      ctx.strokeStyle = this.tema.acento;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i <= ancho; i += 2) ctx.lineTo(x + 12 + i, yEn(i));
      ctx.stroke();
      ctx.fillStyle = this.tema.punto;
      ctx.strokeStyle = this.tema.linea;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + w - 28, yEn(ancho), 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    this.texto('+', x + w - 18, y + 22, { tam: 12 });
    this.texto('-', x + w - 18, y + 62, { tam: 12 });
  }

  // Termómetro vertical
  termometro(etiqueta, grados, x, y) {
    const ctx = this.ctx;
    const alto = 150;
    this.ventana(x - 6, y - 6, 64, alto + 64);
    const k = Math.min(1, Math.max(0, (grados - 15) / 95));
    const lleno = Math.round(alto * k);
    const color = k > 0.6 ? this.tema.caliente : k > 0.25 ? this.tema.tibio : this.tema.frio;
    if (this.tema.pixel) {
      ctx.fillStyle = this.tema.tubo;
      ctx.fillRect(x + 20, y + 20, 12, alto);
      ctx.fillStyle = color;
      ctx.fillRect(x + 20, y + 20 + alto - lleno, 12, lleno);
      ctx.fillRect(x + 16, y + 20 + alto, 20, 14);
    } else {
      ctx.lineWidth = 2;
      ctx.strokeStyle = this.tema.linea;
      ctx.fillStyle = this.tema.tubo;
      ctx.beginPath();
      ctx.roundRect(x + 20, y + 20, 12, alto + 4, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x + 20, y + 24 + alto - lleno, 12, lleno, 6);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 26, y + 28 + alto, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    this.texto(etiqueta, x + 26, y, { tam: 12, alinear: 'center' });
    this.texto(`${Math.round(grados)}°C`, x + 26, y + alto + 40, { tam: 12, alinear: 'center', color: 'acento' });
  }

  // Flecha hacia la derecha entre dos ventanas
  flecha(x, y) {
    const ctx = this.ctx;
    if (this.tema.pixel) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y - 1, 9, 3);
      for (let i = 0; i < 5; i++) ctx.fillRect(x + 8 + i, y - 4 + i, 1, 9 - 2 * i);
      return;
    }
    ctx.fillStyle = this.tema.linea;
    ctx.beginPath();
    ctx.moveTo(x - 1, y - 2);
    ctx.lineTo(x + 7, y - 2);
    ctx.lineTo(x + 7, y - 6);
    ctx.lineTo(x + 14, y);
    ctx.lineTo(x + 7, y + 6);
    ctx.lineTo(x + 7, y + 2);
    ctx.lineTo(x - 1, y + 2);
    ctx.fill();
  }

  // PS1: fundido a negro por escalones. Cel: cierre en círculo, como en los dibujos animados
  fundido(negro) {
    if (negro <= 0) return;
    const ctx = this.ctx;
    if (this.tema.pixel) {
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.round(negro * 8) / 8})`;
      ctx.fillRect(0, 0, HUD_X, HUD_Y);
      return;
    }
    const radio = (1 - negro) * Math.hypot(HUD_X, HUD_Y) * 0.5;
    ctx.fillStyle = this.tema.linea;
    ctx.beginPath();
    ctx.rect(0, 0, HUD_X, HUD_Y);
    ctx.arc(HUD_X / 2, HUD_Y / 2, radio, 0, Math.PI * 2);
    ctx.fill('evenodd');
  }
}
