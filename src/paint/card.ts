import { mulberry32 } from '../core/rng';
import { hexToRgb, TRANSPARENT, type Template } from './model';

export interface CardInfo {
  title: string;
  /** Reparto de casillas por autor (para la barra azul/rosa). Opcional. */
  authors?: { name: string; cells: number; color: string }[];
  stats: string[];          // lineas cortas: "100 %", "28 colores"...
  date: string;
}

const W = 1080, H = 1350;

/** Tarjeta de victoria para compartir: la obra enmarcada sobre un cielo pixel art, con titulo, datos y reparto de autores. */
export async function makeCard(t: Template, info: CardInfo): Promise<Blob> {
  try { await document.fonts.load('28px "Press Start 2P"'); await document.fonts.load('36px "VT323"'); } catch { /* sin fuentes: se usa la del sistema */ }
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  g.imageSmoothingEnabled = false;

  // cielo: bandas moradas con tramado y estrellas
  const bands = ['#120a3a', '#1a1050', '#241668', '#2e1c80', '#3a2494', '#4a2fa8'];
  const px = 12;   // pixel de arte de la tarjeta
  for (let y = 0; y < H / px; y++) for (let x = 0; x < W / px; x++) {
    const t0 = (y / (H / px)) * bands.length, i = Math.min(bands.length - 1, Math.floor(t0 + (((x + y) & 1) ? 0.32 : -0.32)));
    g.fillStyle = bands[Math.max(0, i)]; g.fillRect(x * px, y * px, px, px);
  }
  const rng = mulberry32(0x5eed + t.id.length * 977 + t.w);
  for (let i = 0; i < 90; i++) { g.fillStyle = rng() < 0.3 ? '#ffffff' : '#b8c8ff'; const s = rng() < 0.15 ? px : px / 2; g.globalAlpha = 0.4 + rng() * 0.6; g.fillRect(Math.floor(rng() * (W / px)) * px, Math.floor(rng() * (H / px)) * px, s, s); }
  g.globalAlpha = 1;

  // cabecera
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#a5f3fc'; g.font = '26px "Press Start 2P", monospace'; g.fillText('SOPAVENTURA', W / 2, 70);
  g.fillStyle = '#ffffff'; g.font = '40px "Press Start 2P", monospace';
  let title = info.title.toUpperCase(); while (g.measureText(title).width > W - 120 && title.length > 8) title = title.slice(0, -2) + '…';
  g.fillText(title, W / 2, 138);

  // obra: escala entera (casillas nitidas) dentro de un marco dorado
  const maxW = 880, maxH = 740, sc = Math.max(1, Math.floor(Math.min(maxW / t.w, maxH / t.h)));
  const aw = t.w * sc, ah = t.h * sc, ax = Math.round((W - aw) / 2), ay = 200 + Math.round((maxH - ah) / 2);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(ax - 8, ay + 14, aw + 28, ah + 28);
  g.fillStyle = '#ffd86b'; g.fillRect(ax - 24, ay - 24, aw + 48, ah + 48);
  g.fillStyle = '#3a2a8a'; g.fillRect(ax - 14, ay - 14, aw + 28, ah + 28);
  g.fillStyle = '#fffdf6'; g.fillRect(ax - 6, ay - 6, aw + 12, ah + 12);
  const small = document.createElement('canvas'); small.width = t.w; small.height = t.h;
  const sg = small.getContext('2d')!, id = sg.createImageData(t.w, t.h), d = new Uint32Array(id.data.buffer);
  t.cells.forEach((ci, i) => { if (ci !== TRANSPARENT) { const [r, gg, b] = hexToRgb(t.palette[ci]); d[i] = (255 << 24) | (b << 16) | (gg << 8) | r; } });
  sg.putImageData(id, 0, 0);
  g.drawImage(small, ax, ay, aw, ah);
  // esquinas y destellos
  g.fillStyle = '#fff3b0';
  for (const [cx, cy] of [[ax - 24, ay - 24], [ax + aw + 12, ay - 24], [ax - 24, ay + ah + 12], [ax + aw + 12, ay + ah + 12]]) g.fillRect(cx, cy, 12, 12);
  for (let k = 0; k < 6; k++) {
    const sx = ax + rng() * aw, sy = ay + rng() * ah, r = 14 + rng() * 14;
    g.fillStyle = '#ffffff'; g.fillRect(sx - r, sy - 3, r * 2, 6); g.fillRect(sx - 3, sy - r, 6, r * 2);
  }

  // reparto de autores
  let y = ay + ah + 70;
  const total = info.authors?.reduce((a, b) => a + b.cells, 0) ?? 0;
  if (info.authors && info.authors.length > 1 && total > 0) {
    const bw = 760, bx = (W - bw) / 2;
    let cx = bx;
    for (const a of info.authors) { const w = Math.round((a.cells / total) * bw); g.fillStyle = a.color; g.fillRect(cx, y, w, 26); cx += w; }
    g.strokeStyle = '#07051a'; g.lineWidth = 4; g.strokeRect(bx - 2, y - 2, bw + 4, 30);
    g.font = '44px "VT323", monospace'; g.fillStyle = '#ece6ff';
    g.fillText(info.authors.map(a => `${a.name} ${Math.round((a.cells / total) * 100)}%`).join('   ·   '), W / 2, y + 70);
    y += 112;
  }

  // datos y fecha
  g.font = '42px "VT323", monospace'; g.fillStyle = '#c4b5fd';
  g.fillText(info.stats.join('   ·   '), W / 2, Math.min(H - 110, y + 10));
  g.font = '22px "Press Start 2P", monospace'; g.fillStyle = '#ffd86b';
  g.fillText(info.date, W / 2, H - 60);

  return new Promise(res => cv.toBlob(b => res(b!), 'image/png'));
}
