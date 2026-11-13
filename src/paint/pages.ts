import { mulberry32 } from '../core/rng';

/**
 * Dibujos de linea para "Colorear libre" (estilo cuaderno infantil).
 * Cada forma se rellena de blanco y se perfila en negro, en orden de pintor,
 * asi las lineas tapadas desaparecen y quedan zonas cerradas para el cubo.
 * Coordenadas en un lienzo de 512x512.
 */
export interface MandalaOpts { petals: number; rings: number; seed: number }
export interface Page { id: string; name: string; draw: (g: CanvasRenderingContext2D) => void }

type G = CanvasRenderingContext2D;
const shape = (g: G, p: Path2D) => { g.fill(p); g.stroke(p); };
const circle = (x: number, y: number, r: number) => { const p = new Path2D(); p.arc(x, y, r, 0, Math.PI * 2); return p; };
const oval = (x: number, y: number, rx: number, ry: number, rot = 0) => { const p = new Path2D(); p.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); return p; };
const polyP = (pts: number[][]) => { const p = new Path2D(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); return p; };
const line = (g: G, ...pts: number[][]) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
const curve = (g: G, x1: number, y1: number, cx: number, cy: number, x2: number, y2: number) => { g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo(cx, cy, x2, y2); g.stroke(); };
/** Varias formas unidas con un solo contorno exterior (copas de arbol, nubes). */
const blob = (g: G, parts: Path2D[]) => {
  const lw = g.lineWidth;
  g.lineWidth = lw * 2;
  parts.forEach(p => g.stroke(p));
  parts.forEach(p => g.fill(p));
  g.lineWidth = lw;
};
const heartP = (x: number, y: number, s: number) => {
  const p = new Path2D();
  p.moveTo(x, y + s * 0.9);
  p.bezierCurveTo(x - s * 1.6, y - s * 0.1, x - s * 0.7, y - s * 1.2, x, y - s * 0.45);
  p.bezierCurveTo(x + s * 0.7, y - s * 1.2, x + s * 1.6, y - s * 0.1, x, y + s * 0.9);
  return p;
};

function gato(g: G, stripes = false) {
  shape(g, polyP([[340, 455], [432, 445], [470, 380], [466, 300], [440, 300], [442, 370], [410, 412], [345, 420]]));   // cola
  shape(g, oval(256, 395, 120, 95));                                                                   // cuerpo
  shape(g, oval(256, 410, 55, 70));                                                                    // barriga
  shape(g, oval(200, 478, 42, 24)); shape(g, oval(312, 478, 42, 24));                                  // patas
  shape(g, polyP([[150, 180], [160, 60], [240, 130]])); shape(g, polyP([[362, 180], [352, 60], [272, 130]]));
  shape(g, polyP([[168, 160], [174, 92], [220, 132]])); shape(g, polyP([[344, 160], [338, 92], [292, 132]]));
  shape(g, oval(256, 210, 125, 100));                                                                  // cabeza
  if (stripes) { [[230, 120, 236, 160], [256, 114, 256, 158], [282, 120, 276, 160]].forEach(([a, b, c, d]) => line(g, [a, b], [c, d])); line(g, [140, 380], [180, 390]); line(g, [372, 380], [332, 390]); }
  shape(g, oval(210, 200, 30, 34)); shape(g, oval(302, 200, 30, 34));
  shape(g, oval(214, 204, 12, 22)); shape(g, oval(298, 204, 12, 22));
  shape(g, polyP([[240, 246], [272, 246], [256, 266]]));
  curve(g, 256, 266, 240, 296, 222, 280); curve(g, 256, 266, 272, 296, 290, 280);
  line(g, [190, 260], [100, 245]); line(g, [190, 275], [100, 285]); line(g, [322, 260], [412, 245]); line(g, [322, 275], [412, 285]);
}

function perro(g: G) {
  shape(g, oval(256, 440, 150, 90));
  shape(g, oval(256, 230, 130, 120));
  shape(g, oval(130, 260, 50, 110, 0.25)); shape(g, oval(382, 260, 50, 110, -0.25));                  // orejas
  shape(g, oval(300, 170, 45, 38));                                                                    // mancha
  shape(g, oval(256, 300, 75, 55));                                                                    // hocico
  shape(g, polyP([[230, 340], [282, 340], [278, 385], [256, 395], [234, 385]]));                        // lengua
  shape(g, oval(256, 280, 32, 22));                                                                    // nariz
  shape(g, circle(205, 215, 18)); shape(g, circle(307, 215, 18));
  curve(g, 256, 302, 230, 335, 205, 318); curve(g, 256, 302, 282, 335, 307, 318);
  shape(g, polyP([[196, 470], [316, 470], [300, 500], [212, 500]]));                                    // collar
  shape(g, circle(256, 505, 14));
}

function paloma(g: G) {
  line(g, [230, 400], [222, 470], [190, 480]); line(g, [222, 470], [240, 485]);
  line(g, [290, 400], [292, 470], [262, 482]); line(g, [292, 470], [312, 484]);
  shape(g, polyP([[340, 300], [480, 330], [470, 380], [330, 360]]));                                   // cola
  shape(g, oval(270, 320, 130, 90, -0.1));                                                             // cuerpo
  shape(g, oval(310, 290, 105, 60, -0.2));                                                             // ala
  line(g, [280, 260], [300, 330]); line(g, [320, 252], [340, 320]); line(g, [360, 250], [380, 305]);
  shape(g, oval(170, 230, 60, 75, 0.25));                                                              // cuello
  shape(g, circle(150, 150, 55));                                                                      // cabeza
  shape(g, polyP([[100, 145], [50, 170], [102, 172]]));
  shape(g, circle(140, 140, 14)); shape(g, circle(140, 140, 5));
}

function leopardo(g: G) {
  shape(g, oval(256, 470, 170, 80));
  shape(g, circle(140, 110, 50)); shape(g, circle(372, 110, 50));
  shape(g, circle(140, 115, 26)); shape(g, circle(372, 115, 26));
  shape(g, oval(256, 250, 155, 140));
  const r = mulberry32(5);
  for (let i = 0; i < 22; i++) {
    const a = r() * Math.PI * 2, d = 70 + r() * 70, x = 256 + Math.cos(a) * d * 1.05, y = 230 + Math.sin(a) * d * 0.85;
    if (Math.abs(x - 256) < 70 && y > 200) continue;
    shape(g, oval(x, y, 9 + r() * 6, 7 + r() * 5, r() * 3));
  }
  for (const [x, y] of [[150, 470], [190, 440], [330, 445], [370, 475], [256, 500]]) shape(g, oval(x, y, 14, 10, 0.4));
  shape(g, oval(220, 320, 45, 35)); shape(g, oval(292, 320, 45, 35));                                   // hocico
  shape(g, polyP([[230, 280], [282, 280], [256, 305]]));
  shape(g, oval(200, 225, 28, 20, 0.2)); shape(g, oval(312, 225, 28, 20, -0.2));
  shape(g, circle(200, 225, 9)); shape(g, circle(312, 225, 9));
  line(g, [222, 240], [232, 285]); line(g, [290, 240], [280, 285]);
  curve(g, 256, 305, 240, 345, 220, 340); curve(g, 256, 305, 272, 345, 292, 340);
}

function arbol(g: G) {
  shape(g, polyP([[220, 480], [236, 300], [210, 250], [236, 255], [256, 290], [280, 240], [300, 245], [276, 300], [292, 480]]));
  shape(g, oval(256, 485, 200, 22));
  blob(g, [circle(256, 150, 110), circle(160, 200, 85), circle(352, 200, 85), circle(200, 110, 75), circle(312, 110, 75), circle(256, 240, 80)]);
  const r = mulberry32(9);
  for (let i = 0; i < 9; i++) shape(g, circle(150 + r() * 210, 100 + r() * 160, 16));
  shape(g, circle(120, 470, 18)); shape(g, circle(390, 465, 18));
}

function mariposa(g: G) {
  for (const m of [1, -1]) {
    shape(g, oval(256 + m * 110, 180, 105, 120, -0.5 * m));
    shape(g, oval(256 + m * 85, 345, 80, 95, 0.45 * m));
    shape(g, circle(256 + m * 120, 175, 40)); shape(g, circle(256 + m * 130, 120, 15));
    shape(g, circle(256 + m * 90, 350, 30)); shape(g, circle(256 + m * 140, 230, 18));
  }
  shape(g, oval(256, 280, 22, 140));
  shape(g, circle(256, 130, 28));
  curve(g, 246, 106, 220, 50, 190, 40); curve(g, 266, 106, 292, 50, 322, 40);
  shape(g, circle(188, 40, 10)); shape(g, circle(324, 40, 10));
}

function flor(g: G) {
  shape(g, polyP([[170, 400], [342, 400], [320, 500], [192, 500]]));
  shape(g, polyP([[160, 380], [352, 380], [352, 410], [160, 410]]));
  line(g, [256, 380], [256, 220]);
  shape(g, oval(205, 320, 50, 20, -0.6)); shape(g, oval(307, 300, 50, 20, 0.6));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; shape(g, oval(256 + Math.cos(a) * 80, 170 + Math.sin(a) * 80, 55, 32, a)); }
  shape(g, circle(256, 170, 50));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; shape(g, circle(256 + Math.cos(a) * 25, 170 + Math.sin(a) * 25, 8)); }
}

function pez(g: G) {
  shape(g, polyP([[380, 256], [480, 180], [470, 256], [480, 330]]));
  shape(g, polyP([[230, 160], [300, 90], [330, 170]])); shape(g, polyP([[240, 350], [300, 410], [320, 340]]));
  shape(g, oval(250, 256, 160, 110));
  for (let x = 220; x < 380; x += 40) for (let y = 200; y < 330; y += 40) { const p = new Path2D(); p.arc(x, y, 22, -Math.PI / 2, Math.PI / 2); g.stroke(p); }
  shape(g, oval(150, 256, 30, 100));
  shape(g, circle(140, 225, 22)); shape(g, circle(136, 222, 9));
  curve(g, 100, 280, 115, 300, 135, 285);
  for (const [x, y, r] of [[60, 160, 18], [80, 100, 12], [50, 50, 9], [420, 60, 14]]) shape(g, circle(x, y, r));
}

function casa(g: G) {
  shape(g, circle(420, 90, 50));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; line(g, [420 + Math.cos(a) * 62, 90 + Math.sin(a) * 62], [420 + Math.cos(a) * 85, 90 + Math.sin(a) * 85]); }
  blob(g, [circle(110, 100, 35), circle(150, 85, 45), circle(195, 105, 32)]);
  shape(g, polyP([[0, 440], [512, 440], [512, 512], [0, 512]]));
  shape(g, polyP([[110, 260], [400, 260], [400, 450], [110, 450]]));
  shape(g, polyP([[80, 270], [255, 130], [430, 270]]));
  shape(g, polyP([[330, 190], [370, 190], [370, 120], [330, 120]]));
  shape(g, polyP([[220, 340], [290, 340], [290, 450], [220, 450]])); shape(g, circle(277, 400, 7));
  for (const x of [140, 320]) { shape(g, polyP([[x, 300], [x + 55, 300], [x + 55, 360], [x, 360]])); line(g, [x + 27, 300], [x + 27, 360]); line(g, [x, 330], [x + 55, 330]); }
  for (const x of [40, 470]) { shape(g, circle(x, 430, 22)); line(g, [x, 452], [x, 480]); }
}

function buho(g: G) {
  shape(g, polyP([[0, 430], [512, 410], [512, 445], [0, 465]]));
  shape(g, oval(256, 300, 140, 150));
  shape(g, oval(140, 310, 45, 110, 0.15)); shape(g, oval(372, 310, 45, 110, -0.15));
  shape(g, oval(256, 340, 85, 100));
  for (let y = 280; y < 420; y += 30) for (let x = 200; x < 320; x += 30) { const p = new Path2D(); p.arc(x + (y / 30 % 2) * 15, y, 13, 0, Math.PI); g.stroke(p); }
  shape(g, polyP([[150, 160], [130, 60], [210, 130]])); shape(g, polyP([[362, 160], [382, 60], [302, 130]]));
  shape(g, oval(256, 180, 130, 95));
  shape(g, circle(200, 180, 55)); shape(g, circle(312, 180, 55));
  shape(g, circle(200, 180, 30)); shape(g, circle(312, 180, 30)); shape(g, circle(200, 180, 12)); shape(g, circle(312, 180, 12));
  shape(g, polyP([[240, 215], [272, 215], [256, 250]]));
  for (const x of [215, 256, 297]) shape(g, oval(x, 430, 16, 10));
}

function corazones(g: G) {
  shape(g, heartP(256, 270, 190));
  shape(g, heartP(256, 260, 110));
  for (const [x, y, s] of [[60, 60, 30], [160, 40, 20], [352, 40, 20], [452, 60, 30], [50, 300, 26], [462, 300, 26], [80, 460, 30], [256, 480, 20], [432, 460, 30]]) shape(g, heartP(x, y, s));
}

/** Mandala generado: personalizable con numero de petalos, anillos y semilla. */
export function drawMandala(g: G, o: MandalaOpts): void {
  const r = mulberry32(o.seed), c = 256;
  const rings = Math.max(2, Math.min(7, o.rings)), n = Math.max(4, Math.min(24, o.petals));
  const step = 230 / (rings + 0.6);
  shape(g, circle(c, c, 245));
  for (let k = rings; k >= 1; k--) {
    const R0 = step * (k + 0.4), kind = Math.floor(r() * 4), count = n * (k > rings / 2 && r() < 0.5 ? 2 : 1), off = r() < 0.5 ? 0 : Math.PI / count;
    shape(g, circle(c, c, R0));
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + off, x = c + Math.cos(a) * (R0 - step * 0.45), y = c + Math.sin(a) * (R0 - step * 0.45);
      if (kind === 0) shape(g, oval(x, y, step * 0.42, (Math.PI * R0) / count * 0.75, a));
      else if (kind === 1) shape(g, circle(x, y, Math.min(step * 0.38, (Math.PI * R0) / count * 0.8)));
      else if (kind === 2) { const w = (Math.PI * 2 * (R0 - step * 0.85)) / count / 2; shape(g, polyP([[c + Math.cos(a) * R0, c + Math.sin(a) * R0], [c + Math.cos(a - w / R0) * (R0 - step * 0.85), c + Math.sin(a - w / R0) * (R0 - step * 0.85)], [c + Math.cos(a + w / R0) * (R0 - step * 0.85), c + Math.sin(a + w / R0) * (R0 - step * 0.85)]])); }
      else shape(g, heartP(x, y, step * 0.28));
    }
  }
  shape(g, circle(c, c, step * 0.5));
  shape(g, circle(c, c, step * 0.2));
}

function pinguino(g: G) {
  shape(g, polyP([[0, 440], [512, 420], [512, 512], [0, 512]]));
  for (const [x, y] of [[60, 60], [440, 90], [120, 160], [400, 200], [70, 300], [460, 320]]) { line(g, [x - 10, y], [x + 10, y]); line(g, [x, y - 10], [x, y + 10]); }
  shape(g, oval(256, 320, 130, 150));                 // cuerpo
  shape(g, oval(256, 345, 85, 118));                  // barriga
  shape(g, oval(132, 320, 30, 85, 0.35)); shape(g, oval(380, 320, 30, 85, -0.35));   // alas
  shape(g, oval(256, 170, 95, 85));                   // cabeza
  shape(g, oval(256, 190, 62, 55));                   // cara
  shape(g, circle(230, 175, 13)); shape(g, circle(282, 175, 13));
  shape(g, polyP([[236, 200], [276, 200], [256, 228]]));
  shape(g, oval(210, 465, 45, 18)); shape(g, oval(302, 465, 45, 18));   // patas
  shape(g, polyP([[160, 235], [352, 235], [352, 262], [160, 262]]));    // bufanda
  shape(g, polyP([[300, 262], [335, 262], [345, 330], [305, 330]]));
}

function cohete(g: G) {
  for (const [x, y, r] of [[70, 80, 18], [430, 60, 12], [90, 400, 10], [440, 420, 20], [400, 250, 8]]) shape(g, circle(x, y, r));
  shape(g, circle(80, 230, 40)); shape(g, oval(80, 230, 70, 14, -0.3));     // planeta con anillo
  shape(g, polyP([[256, 470], [210, 400], [302, 400]]));                    // llama
  shape(g, polyP([[256, 440], [232, 400], [280, 400]]));
  shape(g, polyP([[190, 300], [130, 400], [195, 385]])); shape(g, polyP([[322, 300], [382, 400], [317, 385]]));   // aletas
  const body = new Path2D(); body.moveTo(256, 40); body.bezierCurveTo(350, 110, 335, 300, 320, 400); body.lineTo(192, 400); body.bezierCurveTo(177, 300, 162, 110, 256, 40); body.closePath();
  shape(g, body);
  const nose = new Path2D(); nose.moveTo(256, 40); nose.bezierCurveTo(300, 70, 318, 110, 322, 130); nose.lineTo(190, 130); nose.bezierCurveTo(194, 110, 212, 70, 256, 40); nose.closePath();
  shape(g, nose);
  shape(g, circle(256, 210, 42)); shape(g, circle(256, 210, 28));            // ventana
  shape(g, polyP([[200, 320], [312, 320], [314, 345], [198, 345]]));
}

function tarta(g: G) {
  shape(g, oval(256, 450, 220, 40));                                          // plato
  shape(g, polyP([[90, 300], [422, 300], [422, 440], [90, 440]]));            // piso de abajo
  shape(g, polyP([[140, 190], [372, 190], [372, 300], [140, 300]]));          // piso de arriba
  for (let x = 90; x < 422; x += 41.5) { const p = new Path2D(); p.moveTo(x, 300); p.quadraticCurveTo(x + 21, 345, x + 41.5, 300); g.fill(p); g.stroke(p); }
  for (let x = 140; x < 372; x += 38.7) { const p = new Path2D(); p.moveTo(x, 190); p.quadraticCurveTo(x + 19, 228, x + 38.7, 190); g.fill(p); g.stroke(p); }
  for (const x of [200, 256, 312]) { shape(g, polyP([[x - 9, 110], [x + 9, 110], [x + 9, 190], [x - 9, 190]])); shape(g, oval(x, 92, 10, 18)); }
  for (const x of [130, 200, 270, 340, 400]) shape(g, circle(x, 395, 13));
  shape(g, heartP(256, 255, 26));
}

function ballena(g: G) {
  for (let k = 0; k < 3; k++) { const p = new Path2D(); for (let x = 0; x <= 512; x += 8) { const y = 420 + k * 30 + Math.sin(x / 40 + k) * 8; if (x) p.lineTo(x, y); else p.moveTo(x, y); } g.stroke(p); }
  const body = new Path2D(); body.moveTo(60, 300); body.bezierCurveTo(60, 160, 300, 140, 380, 230); body.quadraticCurveTo(430, 200, 470, 150); body.quadraticCurveTo(480, 260, 420, 300);
  body.bezierCurveTo(380, 380, 120, 400, 60, 300); body.closePath(); shape(g, body);
  const belly = new Path2D(); belly.moveTo(70, 310); belly.bezierCurveTo(140, 380, 330, 370, 395, 290); belly.bezierCurveTo(300, 330, 150, 335, 70, 310); belly.closePath(); shape(g, belly);
  shape(g, oval(210, 330, 40, 18, 0.5));                                      // aleta
  shape(g, circle(130, 255, 12));                                             // ojo
  curve(g, 70, 300, 110, 320, 150, 300);
  for (const [x, y] of [[170, 120], [200, 80], [140, 80], [185, 40], [155, 40]]) shape(g, circle(x, y, 12));   // chorro
  line(g, [170, 160], [170, 130]);
}

function coliseo(g: G) {
  shape(g, circle(420, 90, 46));
  shape(g, polyP([[0, 450], [512, 450], [512, 512], [0, 512]]));
  const wall = new Path2D(); wall.moveTo(40, 450); wall.lineTo(40, 200); wall.quadraticCurveTo(256, 120, 472, 230); wall.lineTo(472, 450); wall.closePath(); shape(g, wall);
  for (let row = 0; row < 3; row++) {
    const y0 = 420 - row * 75, h = 50;
    for (let k = 0; k < 7; k++) { const x = 60 + k * 58 + row * 4; if (row === 2 && k > 5) continue; const p = new Path2D(); p.moveTo(x, y0); p.lineTo(x, y0 - h + 18); p.arc(x + 18, y0 - h + 18, 18, Math.PI, 0); p.lineTo(x + 36, y0); p.closePath(); shape(g, p); }
    line(g, [40, y0 - h - 8], [472, y0 - h - 8 + (row === 2 ? 20 : 0)]);
  }
}

export const PAGES: Page[] = [
  { id: 'mandala', name: 'Mandala a tu gusto', draw: () => {} },
  { id: 'blanco', name: 'Hoja en blanco', draw: () => {} },
  { id: 'c-gato', name: 'Gatito', draw: g => gato(g) },
  { id: 'c-olaf', name: 'Olaf', draw: g => gato(g, true) },
  { id: 'c-perro', name: 'Perrete', draw: perro },
  { id: 'c-paloma', name: 'Paloma', draw: paloma },
  { id: 'c-leopardo', name: 'Leopardo', draw: leopardo },
  { id: 'c-buho', name: 'Búho', draw: buho },
  { id: 'c-mariposa', name: 'Mariposa', draw: mariposa },
  { id: 'c-arbol', name: 'Árbol', draw: arbol },
  { id: 'c-flor', name: 'Flor', draw: flor },
  { id: 'c-pez', name: 'Pez', draw: pez },
  { id: 'c-casa', name: 'Casita', draw: casa },
  { id: 'c-corazones', name: 'Corazones', draw: corazones },
  { id: 'c-pinguino', name: 'Pingüino', draw: pinguino },
  { id: 'c-cohete', name: 'Cohete', draw: cohete },
  { id: 'c-tarta', name: 'Tarta', draw: tarta },
  { id: 'c-ballena', name: 'Ballena', draw: ballena },
  { id: 'c-coliseo', name: 'Coliseo (Roma)', draw: coliseo },
];

/** Dibuja las lineas de una pagina sobre un lienzo de `size` px (fondo transparente). */
export function renderLines(page: Page, size: number, mandala?: MandalaOpts): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.fillStyle = '#fff'; g.fillRect(0, 0, size, size);
  g.save(); g.scale(size / 512, size / 512);
  g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 5; g.lineJoin = 'round'; g.lineCap = 'round';
  if (page.id === 'mandala') drawMandala(g, mandala ?? { petals: 10, rings: 4, seed: 1 });
  else page.draw(g);
  g.restore();
  // blanco -> transparente; negro -> linea opaca
  const im = g.getImageData(0, 0, size, size), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const a = 255 - Math.round((d[i] + d[i + 1] + d[i + 2]) / 3); d[i] = d[i + 1] = d[i + 2] = 20; d[i + 3] = a; }
  g.putImageData(im, 0, 0);
  return c;
}
