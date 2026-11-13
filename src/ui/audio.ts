import { getState, subscribe } from '../core/state';

/**
 * Audio 100% sintetizado con Web Audio: efectos y musica chiptune relajante ORIGINALES (sin archivos,
 * sin licencias, funciona offline). Si prefieres pistas propias, ver README ("Musica").
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let timer: number | null = null;
let step = 0;
let nextTime = 0;

/** El AudioContext no se crea hasta el primer toque: es caro (~300 ms) y en iOS no suena antes. */
let armed = false;
function ensure(): AudioContext | null {
  if (!armed) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.connect(master);
    applyVolumes();
  }
  if (ctx.state !== 'running') void ctx.resume().catch(() => {});   // iOS: 'suspended' o 'interrupted' (llamada, otra app)
  return ctx;
}

/** Volumenes separados de musica y efectos (Ajustes). */
function applyVolumes(): void {
  const st = getState().settings;
  if (musicGain) musicGain.gain.value = 0.5 * (st.musicVol ?? 0.8);
  if (sfxGain) sfxGain.gain.value = st.sfxVol ?? 0.9;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, vol: number, dest: AudioNode, slideTo?: number): void {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g); g.connect(dest);
  o.start(start); o.stop(start + dur + 0.02);
}

const N = (semi: number) => 261.63 * Math.pow(2, semi / 12); // C4 + semitonos
/** Cada isla suena un poco distinta: desplaza el tono de los acordes de acierto. */
let flavor = 0;
/** Timbre de los aciertos por mundo: cada isla suena distinta (onda y eco). */
const TIMBRE: Record<string, { wave: OscillatorType; echo: number }> = {
  flores: { wave: 'triangle', echo: 0 }, jardin: { wave: 'triangle', echo: 0 }, bosque: { wave: 'sine', echo: 0.16 }, setas: { wave: 'sine', echo: 0.12 }, otono: { wave: 'triangle', echo: 0.1 },
  ciudad: { wave: 'square', echo: 0 }, parque: { wave: 'triangle', echo: 0 }, noche: { wave: 'sine', echo: 0.2 }, cristal: { wave: 'sine', echo: 0.18 }, espacio: { wave: 'sine', echo: 0.28 },
  oceano: { wave: 'sine', echo: 0.22 }, playa: { wave: 'triangle', echo: 0.08 }, nieve: { wave: 'sine', echo: 0.14 }, dulce: { wave: 'square', echo: 0.06 },
};
let timbre = { wave: 'square' as OscillatorType, echo: 0 };
const FLAVOR: Record<string, number> = { flores: 0, otono: -2, bosque: -3, setas: 3, jardin: 2, noche: -5, cristal: 5, parque: 0, ciudad: -1, playa: 4, nieve: 7, oceano: -4, espacio: 6, dulce: 9 };
export function setSfxFlavor(biome: string | null): void { flavor = biome ? FLAVOR[biome] ?? 0 : 0; timbre = (biome && TIMBRE[biome]) || { wave: 'square', echo: 0 }; }

export type Sfx = 'tap' | 'found' | 'wrong' | 'win' | 'coin' | 'pop' | 'unlock' | 'paint' | 'done' | 'letter' | 'combo' | 'tick' | 'whoosh' | 'stamp' | 'slam' | 'select';

export function sfx(name: Sfx, pitch = 0): void {
  if (!getState().settings.sfx) return;
  if (name === 'found' || name === 'pop' || name === 'select' || name === 'combo') pitch += flavor;
  const c = ensure();
  if (!c || !master) return;
  const t = c.currentTime;
  const d = sfxGain ?? master;
  switch (name) {
    case 'tap': tone(N(12), t, 0.05, 'square', 0.08, d); break;
    case 'pop': tone(N(16 + pitch), t, 0.06, 'square', 0.07, d, N(22 + pitch)); break;
    case 'found': [0, 4, 7].forEach((s, i) => { tone(N(12 + s + pitch), t + i * 0.06, 0.12, timbre.wave, 0.09, d); if (timbre.echo) tone(N(12 + s + pitch), t + i * 0.06 + 0.17, 0.2, timbre.wave, 0.09 * timbre.echo * 2, d); }); break;
    case 'wrong': tone(N(5), t, 0.18, 'sawtooth', 0.06, d, N(-2)); break;
    case 'coin': tone(N(19), t, 0.07, 'square', 0.07, d); tone(N(24), t + 0.07, 0.14, 'square', 0.07, d); break;
    case 'paint': tone(N(14 + (pitch % 12)), t, 0.05, 'triangle', 0.08, d); break;
    case 'done': [0, 4, 7, 12, 16].forEach((s, i) => tone(N(12 + s), t + i * 0.07, 0.16, 'triangle', 0.1, d)); break;
    case 'unlock': [0, 7, 12, 19].forEach((s, i) => tone(N(s), t + i * 0.09, 0.2, 'square', 0.08, d)); break;
    case 'letter': [12, 16, 19].forEach((s, i) => tone(N(s), t + i * 0.12, 0.3, 'triangle', 0.08, d)); break;
    case 'win': [0, 4, 7, 12, 7, 12, 16, 19].forEach((s, i) => tone(N(12 + s), t + i * 0.1, 0.2, 'square', 0.09, d)); break;
    case 'select': tone(N(7 + pitch * 2), t, 0.045, 'square', 0.05, d); tone(N(19 + pitch * 2), t, 0.03, 'triangle', 0.04, d); break;
    case 'combo': [0, 4, 7, 12, 16, 19].slice(0, Math.min(6, 2 + pitch)).forEach((s, i) => tone(N(17 + s), t + i * 0.045, 0.1, 'square', 0.07, d)); break;
    case 'tick': tone(N(31), t, 0.03, 'square', 0.05, d); break;
    case 'whoosh': tone(N(26), t, 0.22, 'triangle', 0.05, d, N(2)); break;
    case 'stamp': tone(N(-10), t, 0.14, 'square', 0.1, d, N(-20)); tone(N(19 + pitch), t + 0.02, 0.16, 'square', 0.07, d); tone(N(26 + pitch), t + 0.08, 0.2, 'triangle', 0.06, d); break;
    case 'slam': tone(N(-14), t, 0.35, 'sawtooth', 0.08, d, N(-26)); [0, 4, 7, 12].forEach((s, i) => tone(N(12 + s), t + 0.05 + i * 0.03, 0.4, 'square', 0.06, d)); break;
  }
}

// ---- Musica: cada sitio tiene su "ambiente" (tempo, acordes, escala e instrumentos) ----
interface Mood { bpm: number; chords: number[][]; scale: number[]; root: number; arp: OscillatorType; lead: OscillatorType; leadVol: number; bass: OscillatorType; melody: number[] }
const MAJ = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]];            // I vi IV V
const MIN = [[-3, 0, 4], [-7, -3, 0], [0, 4, 7], [-5, -1, 2]];            // vi IV I V
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
const MOODS: Record<string, Mood> = {
  menu:    { bpm: 78, chords: MAJ, scale: PENTA, root: 0, arp: 'triangle', lead: 'square', leadVol: 0.035, bass: 'sine', melody: [2, 5, 7] },
  flores:  { bpm: 84, chords: MAJ, scale: PENTA, root: 2, arp: 'triangle', lead: 'square', leadVol: 0.035, bass: 'sine', melody: [2, 5, 7] },
  jardin:  { bpm: 88, chords: MAJ, scale: PENTA, root: 5, arp: 'triangle', lead: 'triangle', leadVol: 0.05, bass: 'sine', melody: [1, 3, 5, 7] },
  parque:  { bpm: 86, chords: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [7, 11, 14]], scale: PENTA, root: 0, arp: 'triangle', lead: 'square', leadVol: 0.03, bass: 'sine', melody: [2, 6] },
  bosque:  { bpm: 68, chords: MIN, scale: [0, 2, 3, 5, 7, 9, 10, 12], root: -2, arp: 'triangle', lead: 'triangle', leadVol: 0.05, bass: 'sine', melody: [3, 7] },
  setas:   { bpm: 72, chords: MIN, scale: [0, 2, 3, 5, 7, 9, 10, 12], root: 1, arp: 'sine', lead: 'triangle', leadVol: 0.05, bass: 'sine', melody: [2, 5, 7] },
  otono:   { bpm: 76, chords: [[-3, 0, 4], [2, 5, 9], [-5, -1, 2], [0, 4, 7]], scale: PENTA, root: -1, arp: 'triangle', lead: 'square', leadVol: 0.03, bass: 'triangle', melody: [2, 7] },
  ciudad:  { bpm: 104, chords: [[0, 4, 7, 11], [-3, 0, 4, 7], [2, 5, 9, 12], [-5, -1, 2, 5]], scale: [0, 2, 4, 7, 9, 11, 12, 14], root: 0, arp: 'square', lead: 'square', leadVol: 0.03, bass: 'square', melody: [1, 3, 4, 6] },
  noche:   { bpm: 70, chords: [[-3, 0, 4], [-7, -3, 0], [-8, -5, -1], [-5, -1, 2]], scale: [0, 2, 3, 5, 7, 8, 10, 12], root: -3, arp: 'sine', lead: 'triangle', leadVol: 0.045, bass: 'sine', melody: [3, 6] },
  cristal: { bpm: 62, chords: [[0, 7, 14], [-5, 2, 9], [-3, 4, 11], [-7, 0, 7]], scale: [0, 2, 4, 6, 7, 9, 11, 12], root: 4, arp: 'sine', lead: 'sine', leadVol: 0.06, bass: 'sine', melody: [2, 5] },
  espacio: { bpm: 58, chords: [[0, 7, 14], [-5, 2, 9], [-3, 4, 11], [-7, 0, 7]], scale: [0, 2, 4, 6, 7, 9, 11, 12], root: -5, arp: 'sine', lead: 'sine', leadVol: 0.06, bass: 'sine', melody: [3, 7] },
  oceano:  { bpm: 64, chords: [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [-5, -1, 2, 5]], scale: PENTA, root: -4, arp: 'sine', lead: 'triangle', leadVol: 0.05, bass: 'sine', melody: [2, 6] },
  playa:   { bpm: 92, chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [5, 9, 12]], scale: PENTA, root: 2, arp: 'triangle', lead: 'square', leadVol: 0.035, bass: 'triangle', melody: [1, 4, 6] },
  nieve:   { bpm: 74, chords: MAJ, scale: [0, 4, 7, 11, 12, 14, 16, 19], root: 7, arp: 'triangle', lead: 'sine', leadVol: 0.06, bass: 'sine', melody: [2, 5, 7] },
  dulce:   { bpm: 112, chords: [[0, 4, 7], [2, 5, 9], [4, 7, 11], [5, 9, 12]], scale: PENTA, root: 5, arp: 'square', lead: 'square', leadVol: 0.03, bass: 'square', melody: [1, 2, 5, 6] },
};
let mood: Mood = MOODS.menu;
let nextMood: Mood | null = null;

/** Cambia el ambiente musical (se aplica al empezar el siguiente compas, sin cortes). */
export function setMusicMood(name: string): void {
  const m = MOODS[name] ?? MOODS.menu;
  if (m !== mood) nextMood = m;
}

function scheduler(): void {
  if (!ctx || !musicGain) return;
  while (nextTime < ctx.currentTime + 0.25) {
    if (nextMood && step % 8 === 0) { mood = nextMood; nextMood = null; }
    const beat = 60 / mood.bpm / 2;   // corcheas
    const bar = Math.floor(step / 8) % mood.chords.length, pos = step % 8;
    const chord = mood.chords[bar].map(n => n + mood.root);
    tone(N(chord[pos % chord.length] - 12 + (pos > 3 ? 12 : 0)), nextTime, beat * 1.8, mood.arp, 0.1, musicGain);
    if (pos === 0) tone(N(chord[0] - 24), nextTime, beat * 7, mood.bass, mood.bass === 'square' ? 0.05 : 0.12, musicGain);
    // melodia suave determinista (no aleatoria, para que no cansen los saltos)
    if (mood.melody.includes(pos) && (bar + pos) % 3 !== 0) {
      const note = mood.scale[(bar * 3 + pos * 2 + Math.floor(step / 32)) % mood.scale.length];
      tone(N(note + 12 + mood.root), nextTime, beat * 1.5, mood.lead, mood.leadVol, musicGain);
    }
    nextTime += beat;
    step++;
  }
}

export function startMusic(): void {
  if (!getState().settings.music || timer !== null) return;
  const c = ensure();
  if (!c) return;
  nextTime = c.currentTime + 0.1;
  timer = window.setInterval(scheduler, 60);
}

export function stopMusic(): void {
  if (timer !== null) { clearInterval(timer); timer = null; }
}

/** Arranca el audio en el primer toque (iOS lo exige) y reacciona a ajustes e interrupciones. */
export function initAudio(): void {
  // iOS solo deja arrancar el audio dentro de touchend/click (pointerdown no cuenta) y puede volver a pausarlo
  // si entra una llamada o se cambia de app: se reintenta en cada toque hasta que suena.
  const evs = ['touchend', 'click', 'keydown'];
  const unlock = () => {
    armed = true;
    const c = ensure();
    if (getState().settings.music) startMusic();
    if (c && c.state === 'running') for (const ev of evs) window.removeEventListener(ev, unlock, true);
  };
  for (const ev of evs) window.addEventListener(ev, unlock, true);
  window.addEventListener('pointerdown', () => { armed = true; }, { capture: true, once: true });
  subscribe(s => { applyVolumes(); if (s.settings.music) startMusic(); else stopMusic(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopMusic(); void ctx?.suspend(); }
    else if (getState().settings.music && ctx) { void ctx.resume(); startMusic(); }
  });
}
