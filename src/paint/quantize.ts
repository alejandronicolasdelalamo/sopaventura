// Reduccion de colores compartida: el "bloqueo de paleta" de los escenarios y los murales pintables.

/** Reduce una imagen a K colores (corte por la mediana) y devuelve la paleta ordenada de oscuro a claro y el indice de cada pixel. */
export function quantize(buf: Uint32Array, K: number): { palette: string[]; cells: Uint8Array } {
  const hist = new Map<number, [number, number, number, number]>();   // clave 5 bits/canal -> [r,g,b,n] (suma)
  for (const v of buf) {
    const r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255, key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const e = hist.get(key);
    if (e) { e[0] += r; e[1] += g; e[2] += b; e[3]++; } else hist.set(key, [r, g, b, 1]);
  }
  const keys = [...hist.keys()];
  const entry = new Map(keys.map(k => { const [r, g, b, n] = hist.get(k)!; return [k, [r / n, g / n, b / n, n] as [number, number, number, number]]; }));
  let boxes: { keys: number[] }[] = [{ keys }];
  const range = (bx: { keys: number[] }, ch: number) => { let lo = 255, hi = 0; for (const k of bx.keys) { const v = entry.get(k)![ch]; if (v < lo) lo = v; if (v > hi) hi = v; } return [lo, hi]; };
  while (boxes.length < K) {
    // se parte la caja con mas "volumen" (rango del canal mas ancho x numero de pixeles)
    let bi = -1, bs = 0, bch = 0;
    boxes.forEach((bx, i) => {
      if (bx.keys.length < 2) return;
      for (let ch = 0; ch < 3; ch++) { const [lo, hi] = range(bx, ch); const w = (hi - lo) * Math.sqrt(bx.keys.reduce((a, k) => a + entry.get(k)![3], 0)); if (w > bs) { bs = w; bi = i; bch = ch; } }
    });
    if (bi < 0) break;
    const bx = boxes[bi];
    const sorted = bx.keys.slice().sort((a, b) => entry.get(a)![bch] - entry.get(b)![bch]);
    const total = sorted.reduce((a, k) => a + entry.get(k)![3], 0);
    let acc = 0, cut = 1;
    for (let i = 0; i < sorted.length; i++) { acc += entry.get(sorted[i])![3]; if (acc >= total / 2) { cut = Math.max(1, Math.min(sorted.length - 1, i + 1)); break; } }
    boxes.splice(bi, 1, { keys: sorted.slice(0, cut) }, { keys: sorted.slice(cut) });
  }
  const colors = boxes.map(bx => {
    let r = 0, g = 0, b = 0, n = 0;
    for (const k of bx.keys) { const e = entry.get(k)!; r += e[0] * e[3]; g += e[1] * e[3]; b += e[2] * e[3]; n += e[3]; }
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)] as [number, number, number];
  });
  const lum = (c: [number, number, number]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const order = colors.map((_, i) => i).sort((a, b) => lum(colors[a]) - lum(colors[b]));
  const rank = new Map(order.map((old, i) => [old, i]));
  const keyToIdx = new Map<number, number>();
  boxes.forEach((bx, i) => bx.keys.forEach(k => keyToIdx.set(k, rank.get(i)!)));
  const cells = new Uint8Array(buf.length);
  buf.forEach((v, i) => { const r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255; cells[i] = keyToIdx.get(((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3))!; });
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return { palette: order.map(i => `#${hex(colors[i][0])}${hex(colors[i][1])}${hex(colors[i][2])}`), cells };
}

/** Quita los pixeles sueltos (un solo punto rodeado de otro color): mas limpio de pintar y de mirar. */
export function despeckle(cells: Uint8Array, w: number, h: number): void {
  const src = cells.slice();
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, me = src[i], cnt = new Map<number, number>();
    let same = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const v = src[i + dy * w + dx];
      if (v === me) same++; else cnt.set(v, (cnt.get(v) ?? 0) + 1);
    }
    if (same > 0) continue;
    let best = me, bn = 0; cnt.forEach((n, v) => { if (n > bn) { bn = n; best = v; } });
    if (bn >= 4) cells[i] = best;
  }
}
