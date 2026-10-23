import { psxMaterial, RES_X, RES_Y } from './psx.js';
import { celMaterial } from './cel.js';
import { isoMaterial } from './iso.js';

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
    contornos: null,
    fondo: 0x1a1c2c,
    niebla: true,
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
    contornos: { grosor: 1.6, tinta: 0x1d1d2b, fuerza: 1 },
    fondo: 0xf3e6cc,
    niebla: true,
    texturas: { escala: 4, ruido: false, suave: true },
    tema: 'cel',
  },
  iso: {
    id: 'iso',
    nombre: 'INFOGRAFÍA ISOMÉTRICA',
    material: isoMaterial,
    ancho3d: 1280,
    alto3d: 960,
    escalaHud: 2,
    detalle: 2, // facetas visibles, como en las ilustraciones low-poly
    lineasGruesas: true,
    flecha: 0.75,
    coloresVivos: true,
    contornos: { grosor: 1.2, tinta: 0x073b4c, fuerza: 0.3 },
    fondo: 0xeef2f7,
    niebla: false,
    texturas: { escala: 4, ruido: false, suave: true },
    tema: 'iso',
    isometrica: true, // cámara ortográfica a 45° y 35,26° de elevación
    diorama: true, // sin pared ni suelo: la encimera flota sobre el fondo liso
    giroCorte: Math.PI / 4, // el corte de la olla mira hacia la cámara isométrica
  },
};
