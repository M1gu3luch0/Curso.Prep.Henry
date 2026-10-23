# ¿Cómo funciona un fogón de inducción? — demo estilo PS1

Vídeo educativo de unos 84 segundos hecho con **Three.js** y un shader que imita a la PlayStation 1. Todo se genera con código: los modelos, las texturas, la animación y la música.

**Vídeo:** [`fogon-induccion-ps1.mp4`](./fogon-induccion-ps1.mp4) (1280×960, 30 fps, con sonido)

## Qué cuenta el vídeo

| # | Escena | Qué se ve |
|---|---|---|
| 0 | Título | La cocina, con el título y "PULSA START" |
| 1 | Por fuera | Una placa de vidrio lisa, sin llama ni resistencias |
| 2 | Despiece | Se levantan la olla y el vidrio: aparecen la bobina de cobre y la electrónica |
| 3 | Corriente | Flechas amarillas recorren la bobina y cambian de sentido (corriente alterna) |
| 4 | Campo magnético | Lazos de campo alrededor de la bobina. Cuando baja la olla, el acero "atrapa" el campo |
| 5 | Corrientes de Foucault | Remolinos naranjas en el fondo de la olla, que se calienta |
| 6 | Hervir | Burbujas y vapor. Termómetros: la olla a 100 °C y el vidrio mucho menos |
| 7 | Olla de vidrio | El campo la atraviesa sin hacer nada: no se calienta |
| 8 | Resumen | Corriente alterna → campo magnético → corrientes inducidas → calor |

Para que se entienda hay algunas simplificaciones:
- La corriente oscila a 0,5 Hz. En un fogón real va a 20.000–100.000 Hz.
- El brillo rojo del fondo está exagerado.
- Las corrientes de Foucault se dibujan sobre el fondo de la olla, aunque en realidad circulan por dentro del metal.

## Cómo se consigue el aspecto PS1

Todo está en [`src/psx.js`](./src/psx.js):

1. **Baja resolución:** la escena 3D se dibuja a 320×240 y se amplía sin suavizar. Los textos van a 640×480.
2. **Vértices que tiemblan:** cada vértice se redondea a la cuadrícula de píxeles (*vertex snapping*).
3. **Texturas que se deforman:** mapeo afín, es decir, sin corrección de perspectiva.
4. **Texturas diminutas** (16×16 a 192×128) con filtro `NearestFilter` y sin mipmaps. Se generan en [`src/texturas.js`](./src/texturas.js).
5. **Luz por vértice** (Gouraud) en lugar de luz por píxel.
6. **Color de 15 bits con tramado:** 32 niveles por canal y una matriz de Bayer 4×4.
7. **Niebla** a poca distancia, pocos polígonos y una interfaz de ventanas azules al estilo de los RPG de la época.

## Verlo en el navegador (en tiempo real)

Los módulos ES no funcionan abriendo el archivo con doble clic; hace falta un servidor:

```bash
cd ps1-induccion
npx serve .
```

Abre la dirección que te indique. three.js se carga desde un CDN. Haz clic en la imagen para volver a empezar; con `?t=40` en la URL empieza en el segundo 40.

## Volver a generar el vídeo

Necesitas Node 18+, ffmpeg y Chromium para Playwright (`npx playwright install chromium` si no lo tienes).

```bash
cd ps1-induccion
npm install
npm run render        # crea fogon-induccion-ps1.mp4
npm run fotos         # solo algunos fotogramas sueltos, en ./capturas
```

[`render.mjs`](./render.mjs) abre la página en Chromium sin ventana y pide cada fotograma con su tiempo exacto. Así el vídeo sale fluido aunque el ordenador sea lento. Los fotogramas se pasan a ffmpeg junto con la banda sonora, que se sintetiza en [`sonido.mjs`](./sonido.mjs).

## Archivos

```
index.html        página que muestra la demo
src/psx.js        material con los efectos de PS1
src/texturas.js   texturas pixeladas generadas por código
src/escena.js     cocina, placa, bobina, olla, campo y partículas
src/guion.js      escenas: cámara, textos y qué se ve en cada momento
src/hud.js        textos, ventanas, termómetros y osciloscopio
src/main.js       une todo; modo tiempo real o modo captura
render.mjs        exporta el vídeo (Playwright + ffmpeg)
sonido.mjs        música y pitidos sintetizados
```
