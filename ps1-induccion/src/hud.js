// Capa 2D de textos y ventanas. Se dibuja siempre en coordenadas de 640x480;
// en los estilos cel e iso el lienzo es el doble de grande y se escala.
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
    grosorLinea: 2,
    punto: '#ffe14a',
    eje: '#5a64a8',
    tubo: '#10142a',
    frio: '#4ab0ff',
    tibio: '#ffa030',
    caliente: '#ff4a2a',
    ventana: 'rpg',
    fundido: { tipo: 'escalones', color: '#000000' },
    entradaTitulo: 'fija',
  },
  // Cel: fuente gruesa y bocadillos blancos con trazo y sombra de tinta
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
    grosorLinea: 3,
    punto: '#ff922b',
    eje: '#ced4da',
    tubo: '#e9ecef',
    frio: '#4dabf7',
    tibio: '#ffa94d',
    caliente: '#f03e3e',
    ventana: { fondo: '#fffaf0', radio: 12, borde: '#1d1d2b', grosorBorde: 3, sombra: { color: '#1d1d2b', x: 4, y: 5, desenfoque: 0 } },
    fundido: { tipo: 'iris', color: '#1d1d2b' },
    entradaTitulo: 'rebote',
  },
  // Infografía: tarjetas blancas con sombra suave, colores planos y número de paso
  iso: {
    pixel: false,
    fuente: 'Inter, "DejaVu Sans", sans-serif',
    peso: '700',
    texto: '#073b4c',
    textoLibre: '#073b4c',
    acento: '#118ab2',
    alerta: '#ef476f',
    titulo: ['#073b4c', '#0b5d7a', '#118ab2'],
    borde: null,
    bordeLibre: '#ffffff',
    linea: '#073b4c',
    grosorLinea: 1.5,
    punto: '#ef476f',
    eje: '#dfe7ef',
    tubo: '#e9eef4',
    frio: '#118ab2',
    tibio: '#ffd166',
    caliente: '#ef476f',
    ventana: { fondo: '#ffffff', radio: 14, borde: null, sombra: { color: 'rgba(7, 59, 76, 0.18)', x: 0, y: 4, desenfoque: 14 } },
    fundido: { tipo: 'suave', color: '#eef2f7' },
    entradaTitulo: 'deslizar',
    cabecera: true, // número y título de cada paso encima del texto
  },
};

export class Hud {
  constructor(canvas, estilo) {
    this.tema = TEMAS[estilo.tema];
    this.escala = estilo.escalaHud;
    canvas.width = HUD_X * this.escala;
    canvas.height = HUD_Y * this.escala;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.scale(this.escala, this.escala);
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

  // PS1: ventana azul de RPG. Cel e iso: tarjeta redondeada, con la sombra de su tema
  ventana(x, y, w, h) {
    const ctx = this.ctx;
    const v = this.tema.ventana;
    if (v === 'rpg') {
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
      return;
    }

    const radio = Math.min(v.radio, h / 2);
    const { sombra } = v;
    if (sombra.desenfoque) {
      // shadowBlur y shadowOffset van en píxeles reales, no les afecta la escala del lienzo
      ctx.save();
      ctx.shadowColor = sombra.color;
      ctx.shadowBlur = sombra.desenfoque * this.escala;
      ctx.shadowOffsetX = sombra.x * this.escala;
      ctx.shadowOffsetY = sombra.y * this.escala;
      ctx.fillStyle = v.fondo;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radio);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = sombra.color;
      ctx.beginPath();
      ctx.roundRect(x + sombra.x, y + sombra.y, w, h, radio);
      ctx.fill();
      ctx.fillStyle = v.fondo;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radio);
      ctx.fill();
    }
    if (v.borde) {
      ctx.lineWidth = v.grosorBorde;
      ctx.strokeStyle = v.borde;
      ctx.stroke();
    }
  }

  // Título de la portada: fijo (PS1), con rebote (cel) o deslizándose hacia arriba (iso)
  titulo(lineas, local) {
    const ctx = this.ctx;
    const s = Math.min(1, local / 0.7);
    ctx.save();
    ctx.translate(HUD_X / 2, 120);
    if (this.tema.entradaTitulo === 'rebote') {
      const k = 1 + 2.70158 * (s - 1) ** 3 + 1.70158 * (s - 1) ** 2;
      ctx.scale(k, k);
    } else if (this.tema.entradaTitulo === 'deslizar') {
      ctx.globalAlpha = s;
      ctx.translate(0, (1 - s) ** 2 * 30);
    }
    lineas.forEach((linea, i) => {
      this.texto(linea, 0, -28 + i * 42, { tam: 34, color: 'titulo', grosor: 2, alinear: 'center', contorno: true });
    });
    ctx.restore();
  }

  // Cuadro de diálogo con efecto máquina de escribir (en iso, con número y título del paso)
  dialogo(texto, local, { numero, titulo } = {}) {
    const cabecera = this.tema.cabecera && titulo;
    const x = 16;
    const y = cabecera ? 344 : 360;
    const w = HUD_X - 32;
    const alto = cabecera ? 124 : 108;
    this.ventana(x, y, w, alto);

    let yTexto = y + 14;
    if (cabecera) {
      const ctx = this.ctx;
      ctx.fillStyle = this.tema.acento;
      ctx.beginPath();
      ctx.arc(x + 30, y + 24, 12, 0, Math.PI * 2);
      ctx.fill();
      this.texto(String(numero), x + 30, y + 16, { tam: 14, alinear: 'center', color: '#ffffff' });
      this.texto(titulo.toUpperCase(), x + 50, y + 16, { tam: 14, color: 'acento' });
      yTexto = y + 46;
    }

    const lineas = this.partirLineas(texto, w - 36);
    let quedan = Math.max(0, Math.floor((local - RETRASO_TEXTO) * LETRAS_POR_SEGUNDO));
    lineas.forEach((linea, i) => {
      const visible = linea.slice(0, Math.max(0, quedan));
      quedan -= linea.length + 1;
      this.texto(visible, x + 18, yTexto + i * 22);
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
    ctx.lineWidth = this.tema.grosorLinea;
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
      if (this.tema.ventana.borde) ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x + 20, y + 24 + alto - lleno, 12, lleno, 6);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 26, y + 28 + alto, 10, 0, Math.PI * 2);
      ctx.fill();
      if (this.tema.ventana.borde) ctx.stroke();
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

  // Transición entre escenas: a negro por escalones (PS1), cierre en círculo (cel) o
  // fundido suave al color de fondo (iso)
  fundido(negro) {
    if (negro <= 0) return;
    const ctx = this.ctx;
    const { tipo, color } = this.tema.fundido;
    ctx.fillStyle = color;
    if (tipo === 'iris') {
      const radio = (1 - negro) * Math.hypot(HUD_X, HUD_Y) * 0.5;
      ctx.beginPath();
      ctx.rect(0, 0, HUD_X, HUD_Y);
      ctx.arc(HUD_X / 2, HUD_Y / 2, radio, 0, Math.PI * 2);
      ctx.fill('evenodd');
      return;
    }
    ctx.globalAlpha = tipo === 'escalones' ? Math.round(negro * 8) / 8 : negro;
    ctx.fillRect(0, 0, HUD_X, HUD_Y);
    ctx.globalAlpha = 1;
  }
}
