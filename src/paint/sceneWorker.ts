/// <reference lib="webworker" />
// Pinta los escenarios del mapa fuera del hilo principal: asi el scroll y los toques no se atascan.
import { renderSceneBuf, type SceneInput } from './scene';
import { builtinTemplates } from './images';
import { PROP_IDS, propSprite } from './props';
import { muralTemplate } from './murals';
import { ISLANDS } from '../data/islands';

self.onmessage = (e: MessageEvent<{ id: number; input: SceneInput; type?: 'builtin' | 'mural'; islandId?: string }>) => {
  const { id, input } = e.data;
  if (e.data.type === 'mural') {
    const isl = ISLANDS.find(i => i.id === e.data.islandId);
    (self as unknown as Worker).postMessage({ id, template: isl ? muralTemplate(isl) : null });
    return;
  }
  if (e.data.type === 'builtin') { (self as unknown as Worker).postMessage({ id, list: builtinTemplates(), props: PROP_IDS.map(p => propSprite(p)) }); return; }
  try {
    const r = renderSceneBuf(input);
    (self as unknown as Worker).postMessage({ id, W: r.W, H: r.H, buf: r.buf, landmark: r.landmark, cloud: r.cloud, ponds: r.ponds }, [r.buf.buffer, ...(r.landmark ? [r.landmark.buf.buffer] : [])]);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: String(err) });
  }
};
