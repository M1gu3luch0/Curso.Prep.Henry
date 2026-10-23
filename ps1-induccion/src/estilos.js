import { psxMaterial, RES_X, RES_Y } from './psx.js';
import { celMaterial } from './cel.js';

// Todo lo que cambia entre un estilo y otro. La escena, el guion y la cámara son los mismos.
export const ESTILOS = {
  ps1: {
    id: 'ps1',
    nombre: 'ESTILO PS1',
    material: psxMaterial,
    ancho3d: RES_X, // la escena se dibuja a 320x240 y se amplía sin suavizar
    alto3d: RES_Y,
    escalaHud: 1, // textos a 640x480
    detalle: 1, // multiplica los segmentos de cilindros, tubos y tornos
    lineasGruesas: false,
    flecha: 1, // tamaño de las flechas de corriente y campo
    coloresVivos: false,
    contornos: false,
    fondo: 0x1a1c2c,
    texturas: { escala: 1, ruido: true, suave: false },
    tema: 'psx',
  },
  cel: {
    id: 'cel',
    nombre: 'ESTILO CEL-SHADING',
    material: celMaterial,
    ancho3d: 1280,
    alto3d: 960,
    escalaHud: 2, // textos a 1280x960
    detalle: 3,
    lineasGruesas: true,
    flecha: 0.75,
    coloresVivos: true,
    contornos: true,
    fondo: 0xf3e6cc,
    texturas: { escala: 4, ruido: false, suave: true },
    tema: 'cel',
  },
};
