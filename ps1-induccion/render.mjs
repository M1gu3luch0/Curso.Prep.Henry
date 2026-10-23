// Renderiza la demo fotograma a fotograma en Chromium (sin ventana) y la pasa a vídeo con ffmpeg.
//
//   node render.mjs                       -> fogon-induccion-ps1.mp4
//   node render.mjs --salida=otro.mp4
//   node render.mjs --fotos=3,12.5,40     -> PNG sueltos de esos segundos (en ./capturas)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESCENAS } from './src/guion.js';
import { bandaSonoraWav } from './sonido.mjs';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const ORIGEN = 'http://demo.local';
const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript' };

const opciones = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [clave, valor = ''] = a.replace(/^--/, '').split('=');
    return [clave, valor];
  }),
);

const navegador = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pagina = await navegador.newPage();
pagina.on('pageerror', (e) => console.error('Error en la página:', e.message));
pagina.on('console', (m) => m.type() === 'error' && console.error(m.text()));

// Se sirven los archivos locales y three.js desde node_modules: no hace falta red
await pagina.route(THREE_CDN, async (ruta) =>
  ruta.fulfill({
    body: await readFile(path.join(RAIZ, 'node_modules/three/build/three.module.js')),
    contentType: 'text/javascript',
  }),
);
await pagina.route(`${ORIGEN}/**`, async (ruta) => {
  const archivo = path.join(RAIZ, new URL(ruta.request().url()).pathname);
  ruta.fulfill({ body: await readFile(archivo), contentType: TIPOS[path.extname(archivo)] ?? 'application/octet-stream' });
});

await pagina.goto(`${ORIGEN}/index.html?captura`);
await pagina.waitForFunction(() => window.DEMO?.listo, null, { timeout: 30000 });

const capturar = async (t) => {
  const dataUrl = await pagina.evaluate((s) => window.DEMO.capturar(s), t);
  return Buffer.from(dataUrl.split(',')[1], 'base64');
};

if ('fotos' in opciones) {
  const carpeta = path.join(RAIZ, 'capturas');
  await mkdir(carpeta, { recursive: true });
  for (const s of opciones.fotos.split(',').map(Number)) {
    const archivo = path.join(carpeta, `t${String(s).replace('.', '_')}.png`);
    await writeFile(archivo, await capturar(s));
    console.log(archivo);
  }
} else {
  const salida = path.resolve(RAIZ, opciones.salida || 'fogon-induccion-ps1.mp4');
  const duracion = await pagina.evaluate(() => window.DEMO.duracion);
  const total = Math.round(duracion * FPS);

  const temporal = await mkdtemp(path.join(os.tmpdir(), 'induccion-'));
  const audio = path.join(temporal, 'banda-sonora.wav');
  await writeFile(audio, bandaSonoraWav(ESCENAS));

  // 640x480 -> 1280x960 duplicando píxeles (sin suavizar)
  const ffmpeg = spawn(
    'ffmpeg',
    [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-i', audio,
      '-vf', 'scale=iw*2:ih*2:flags=neighbor',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-tune', 'animation', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k', '-shortest',
      '-movflags', '+faststart',
      salida,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const terminado = new Promise((ok, mal) =>
    ffmpeg.on('close', (codigo) => (codigo === 0 ? ok() : mal(new Error(`ffmpeg terminó con código ${codigo}`)))),
  );

  for (let i = 0; i < total; i++) {
    if (!ffmpeg.stdin.write(await capturar(i / FPS))) await new Promise((ok) => ffmpeg.stdin.once('drain', ok));
    if (i % FPS === 0) process.stdout.write(`\r${i}/${total} fotogramas`);
  }
  ffmpeg.stdin.end();
  await terminado;
  await rm(temporal, { recursive: true });
  console.log(`\nVídeo listo: ${salida}`);
}

await navegador.close();
