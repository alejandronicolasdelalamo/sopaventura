import { checkAchievements } from '../core/achievements';
import { addCoins, getState, update } from '../core/state';
import { getContent, phrase } from '../data/content';
import { sendMessage } from '../net/sync';
import { sfx } from '../ui/audio';
import { confetti } from '../ui/confetti';
import { button, el, flyCoins, toast } from '../ui/dom';
import { pixelIcon } from '../ui/icons';
import { back, navigate } from '../ui/router';

export const SKINS = [
  { id: 'clasico', name: 'Clásico', price: 0, colors: ['#fff8e8', '#3a2a52', '#ff7eb6'] },
  { id: 'noche', name: 'Noche', price: 80, colors: ['#2a2744', '#f6e7ff', '#a678de'] },
  { id: 'atardecer', name: 'Atardecer', price: 80, colors: ['#ffe1c4', '#6b2d3c', '#ff7a45'] },
  { id: 'pastel', name: 'Pastel', price: 100, colors: ['#eaf6ff', '#3b4a6b', '#9ad0ff'] },
  { id: 'bosque', name: 'Bosque', price: 120, colors: ['#e3f3d5', '#274a2a', '#6cbd4c'] },
  { id: 'neon', name: 'Neón', price: 150, colors: ['#14122b', '#00f5d4', '#ff4ecd'] },
] as const;

export function renderTienda(root: HTMLElement): void {
  const screen = el('div', 'screen');
  const top = el('header', 'topbar');
  const b = button('', 'btn small icon-btn', () => back());
  b.append(pixelIcon('back', '#fff')); b.setAttribute('aria-label', 'Volver');
  const coinBox = el('div', 'coin-box');
  const draw = () => { coinBox.replaceChildren(pixelIcon('coin', '#ffb400'), el('span', '', String(getState().coins))); };
  top.append(b, el('h1', 'page-title', 'Tienda'), coinBox);
  const body = el('main', 'page-body');

  function buy(price: number, ok: () => void, from: HTMLElement): void {
    if (getState().coins < price) { toast('Te faltan monedas, Cuchi.'); sfx('wrong'); return; }
    addCoins(-price); ok(); sfx('unlock'); confetti(innerWidth / 2, innerHeight / 3, 30); flyCoins(coinBox, from, 4);
    draw(); render();
  }

  function row(title: string, desc: string, price: number, label: string, onBuy: (btn: HTMLElement) => void, owned = false, icon = 'star'): HTMLElement {
    const r = el('div', 'card shop-row');
    r.append(pixelIcon(icon, '#a78bfa', 'picon big'));
    const t = el('div', 'ach-text'); t.append(el('strong', '', title), el('small', '', desc));
    const btn = button('', owned ? 'btn small alt' : 'btn small', () => onBuy(btn));
    if (owned) btn.textContent = label;
    else { btn.append(pixelIcon('coin', '#ffd86b'), document.createTextNode(` ${price}`)); btn.setAttribute('aria-label', `${label} por ${price} monedas`); }
    r.append(t, btn);
    return r;
  }

  function render(): void {
    body.replaceChildren();
    const s = getState();
    body.append(el('p', 'shop-phrase', phrase('shop')));

    body.append(el('h2', 'sec', 'Ayudas'));
    body.append(
      row('Pistas ×3', `Tienes ${s.hints}. Marcan la primera letra de una palabra.`, 30, 'Comprar', btn => buy(30, () => update(x => { x.hints += 3; }), btn), false, 'bulb'),
      row('Revelar ×1', `Tienes ${s.reveals}. Encuentra una palabra por ti.`, 40, 'Comprar', btn => buy(40, () => update(x => { x.reveals += 1; }), btn), false, 'eye'),
    );

    const pw = s.powerups ?? { freeze: 0, clean: 0, bolt: 0 };
    body.append(el('h2', 'sec', 'Potenciadores'));
    body.append(
      row('Congelar ×2', `Tienes ${pw.freeze}. Para el reloj 10 segundos.`, 30, 'Comprar', btn => buy(30, () => update(x => { x.powerups = { ...pw, ...x.powerups, freeze: (x.powerups?.freeze ?? 0) + 2 }; }), btn), false, 'snow'),
      row('Limpiar ×2', `Tienes ${pw.clean}. Apaga 12 s las letras que no forman ninguna palabra.`, 35, 'Comprar', btn => buy(35, () => update(x => { x.powerups = { ...pw, ...x.powerups, clean: (x.powerups?.clean ?? 0) + 2 }; }), btn), false, 'broom'),
      row('Rayo ×2', `Tienes ${pw.bolt}. Ilumina la fila donde empieza una palabra.`, 25, 'Comprar', btn => buy(25, () => update(x => { x.powerups = { ...pw, ...x.powerups, bolt: (x.powerups?.bolt ?? 0) + 2 }; }), btn), false, 'bolt'),
    );

    body.append(
      row('Radar ×2', `Tienes ${pw.radar ?? 0}. Marca la zona donde hay una palabra extra escondida.`, 30, 'Comprar', btn => buy(30, () => update(x => { x.powerups = { ...pw, ...x.powerups, radar: (x.powerups?.radar ?? 0) + 2 }; }), btn), false, 'radar'),
    );

    body.append(el('h2', 'sec', 'Fondos del tablero'));
    SKINS.forEach(k => {
      const owned = k.price === 0 || s.owned.includes(`skin:${k.id}`);
      const active = s.skin === k.id;
      const r = row(k.name, active ? 'En uso' : owned ? 'Comprado' : 'Estilo de tablero', k.price, active ? 'En uso' : owned ? 'Usar' : 'Comprar', btn => {
        if (owned) { update(x => { x.skin = k.id; }); sfx('tap'); render(); }
        else buy(k.price, () => update(x => { x.owned.push(`skin:${k.id}`); x.skin = k.id; }), btn);
      }, owned, 'brush');
      const sw = el('span', 'skin-swatch'); k.colors.forEach(c => { const i = el('i'); i.style.background = c; sw.append(i); });
      r.querySelector('.ach-text')!.append(sw);
      body.append(r);
    });

    body.append(el('h2', 'sec', 'Dibujos para pintar'));
    const go = el('div', 'card shop-row');
    go.append(pixelIcon('brush', '#a78bfa', 'picon big'));
    const t = el('div', 'ach-text'); t.append(el('strong', '', 'Catálogo de dibujos'), el('small', '', 'Se desbloquean con monedas o completando islas'));
    go.append(t, button('Ver', 'btn small', () => navigate('pintar')));
    body.append(go);

    body.append(el('h2', 'sec', 'Vales y regalos'));
    getContent().vouchers.forEach(v => {
      const got = s.vouchers.includes(v.id);
      body.append(row(v.title, got ? 'Canjeado ✔ (Nico ya lo sabe)' : v.desc, v.price, got ? 'Canjeado' : 'Canjear', btn => {
        if (got) return;
        buy(v.price, () => {
          update(x => { x.vouchers.push(v.id); });
          sendMessage('voucher', `Vale canjeado: ${v.title}`);
          checkAchievements();
        }, btn);
      }, got, 'heart'));
    });
  }
  render();
  screen.append(top, body);
  root.append(screen);
  draw();
}
