# ¿Cómo funciona un fogón de inducción? — demo en tres estilos

Vídeo educativo de unos 84 segundos hecho con **Three.js**, en tres estilos visuales: **PS1**, **cel-shading** e **infografía isométrica**. Todo se genera con código: los modelos, las texturas, la animación y la música. Los tres vídeos comparten escena y guion; solo cambia la "capa de estilo".

| Estilo | Vídeo |
|---|---|
| PlayStation 1 | [`fogon-induccion-ps1.mp4`](./fogon-induccion-ps1.mp4) |
| Cel-shading (dibujo animado) | [`fogon-induccion-cel.mp4`](./fogon-induccion-cel.mp4) |
| Infografía isométrica | [`fogon-induccion-iso.mp4`](./fogon-induccion-iso.mp4) |

Los tres son de 1280×960, a 30 fps y con sonido.

## Qué cuenta el vídeo

| # | Escena | Qué se ve |
|---|---|---|
| 0 | Título | La cocina, con el título (en PS1, con "PULSA START") |
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

## Cómo se consigue el cel-shading

Está en [`src/cel.js`](./src/cel.js):

1. **Luz en tres tonos:** en lugar de un degradado hay tres franjas de color fijas, y las sombras tiran a azul.
2. **Brillo "recortado":** los metales y el agua tienen una mancha de brillo blanca de bordes duros.
3. **Contornos de tinta:** se dibuja la escena una segunda vez guardando la profundidad y la orientación (normal) de cada píxel. Donde cambian de golpe entre píxeles vecinos se pinta una línea oscura. Los objetos transparentes y las líneas de campo no llevan contorno.
4. **Más detalle:** cilindros, tubos y olla con el triple de segmentos, texturas limpias a 4× de resolución y suavizadas, y antialiasing.
5. **Elementos de dibujo animado:** líneas de campo gruesas, vapor en forma de nubecitas, bocadillos blancos con sombra de tinta y transiciones de cierre en círculo.

## Cómo se consigue la infografía isométrica

Está en [`src/iso.js`](./src/iso.js) y en la cámara de [`src/main.js`](./src/main.js):

1. **Cámara isométrica:** ortográfica (sin perspectiva), mirando desde la diagonal (1, 1, 1): 45° de giro y 35,26° de elevación. Cada escena del guion indica qué punto encuadrar y con cuánto zoom.
2. **Colores planos en facetas:** cada cara se pinta de un solo color según hacia dónde mira (arriba claro, frente medio, lateral oscuro). Las texturas se sustituyen por colores pastel lisos, salvo la vitrocerámica y la placa electrónica.
3. **Diorama:** sin pared ni suelo; la encimera flota sobre una peana y un fondo liso.
4. **Contornos muy suaves** y la olla cortada mirando hacia la cámara isométrica.
5. **Tarjetas de infografía:** blancas con sombra difusa, número y título de cada paso, y fundidos suaves al color de fondo.

Lo que cambia entre estilos está reunido en [`src/estilos.js`](./src/estilos.js).

## Verlo en el navegador (en tiempo real)

Los módulos ES no funcionan abriendo el archivo con doble clic; hace falta un servidor:

```bash
cd ps1-induccion
npx serve .
```

Abre la dirección que te indique: por defecto se ve en PS1; con `?estilo=cel` en la URL, en cel-shading, y con `?estilo=iso`, en infografía isométrica. three.js se carga desde un CDN. Haz clic en la imagen para volver a empezar; con `?t=40` en la URL empieza en el segundo 40.

## Volver a generar los vídeos

Necesitas Node 18+, ffmpeg y Chromium para Playwright (`npx playwright install chromium` si no lo tienes).

```bash
cd ps1-induccion
npm install
npm run render        # crea fogon-induccion-ps1.mp4
npm run render:cel    # crea fogon-induccion-cel.mp4
npm run render:iso    # crea fogon-induccion-iso.mp4
npm run fotos         # solo algunos fotogramas sueltos, en ./capturas (fotos:cel y fotos:iso para los otros estilos)
```

[`render.mjs`](./render.mjs) abre la página en Chromium sin ventana y pide cada fotograma con su tiempo exacto. Así el vídeo sale fluido aunque el ordenador sea lento. Los fotogramas se pasan a ffmpeg junto con la banda sonora, que se sintetiza en [`sonido.mjs`](./sonido.mjs).

## Archivos

```
index.html        página que muestra la demo
src/estilos.js    lo que cambia entre PS1, cel-shading e isométrica
src/psx.js        material con los efectos de PS1
src/cel.js        material cel-shading y contornos de tinta
src/iso.js        material de colores planos en facetas (infografía)
src/texturas.js   texturas generadas por código
src/escena.js     cocina, placa, bobina, olla, campo y partículas
src/guion.js      escenas: cámara, textos y qué se ve en cada momento
src/hud.js        textos, ventanas, termómetros y osciloscopio (tres temas)
src/main.js       une todo; modo tiempo real o modo captura
render.mjs        exporta el vídeo (Playwright + ffmpeg)
sonido.mjs        música y pitidos sintetizados
```
