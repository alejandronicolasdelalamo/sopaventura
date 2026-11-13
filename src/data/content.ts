import { pick } from '../core/rng';

/**
 * Contenido base editable. Lo personal de verdad (cartas, fotos, vales con regalos reales) se añade desde el
 * panel secreto y vive en Supabase, no en este archivo (el repositorio no debe contener cosas intimas).
 */
export interface Voucher { id: string; title: string; desc: string; price: number }
export interface Finale { letter: string; photoUrl: string; bigVoucher: string; surprise: string }

export interface Content {
  phrases: Record<'loading' | 'win' | 'found' | 'shop' | 'pause' | 'paint' | 'paintDone' | 'fail', string[]>;
  vouchers: Voucher[];
  finale: Finale;
  eggs: { id: string; trigger: string; message: string; coins: number; word?: string }[];
  romaUnlocked?: boolean;
  extraWords: Record<string, string[]>;
}

export const BASE_CONTENT: Content = {
  phrases: {
    loading: ['Cargando, Cuchi…', 'Un momentito, Izanis…', 'Preparando letras con cariño…', 'Calentando al Burrito…', 'Olaf supervisa la carga…'],
    win: ['¡Lo has clavado, Cuchi!', '¡Eres la mejor, Izanis!', '¡Burrito orgulloso!', '¡Nicolasia aprueba!', '¡Otra más para la colección!'],
    found: ['¡Esa!', '¡Bien visto!', '¡Ojo de águila, Cuchi!', '¡Toma ya!'],
    shop: ['¿Algún capricho, Izanis?', 'Hoy invita Nicolasia (con tus monedas).', 'Todo para ti, Cuchi.'],
    pause: ['Descansa un poquito, Cuchi.', 'ok mañana 💜', 'Olaf te guarda el sitio.', 'Respira. Aquí no hay prisa.'],
    paint: ['Poco a poco, Cuchi.', 'Cada color cuenta.', 'Qué bonito va quedando...'],
    paintDone: ['¡Mira qué bonito, Cuchi!', '¡Obra de arte, Izanis!', '¡Para enmarcar!'],
    fail: ['Casi, Cuchi. Otra vez.', 'ok mañana 💜... o ahora mismo.', 'Burrito cree en ti.'],
  },
  vouchers: [
    { id: 'v-ejemplo-1', title: 'Vale de ejemplo', desc: 'Edita este vale desde el panel secreto de Nico.', price: 200 },
  ],
  finale: {
    letter: '[Aquí irá la carta larga de Nico. Se escribe en el panel secreto.]',
    photoUrl: '',
    bigVoucher: '[El vale gordo. Se define en el panel secreto.]',
    surprise: '[La sorpresa final. Se define en el panel secreto.]',
  },
  eggs: [
    { id: 'titulo7', trigger: 'Toca el título 7 veces', message: 'ok mañana 💜', coins: 20 },
    { id: 'ragebite', trigger: 'Encuentra RAGEBAIT en una sopa', message: '¡RAGEBAIT! Nico ya está calentando.', coins: 15 },
    { id: 'okmanana', trigger: 'Encuentra OKMAÑANA en una sopa', message: 'ok mañana 💜', coins: 15 },
    { id: 'olaf5', trigger: 'Toca a Olaf 5 veces', message: 'Miau. (Olaf te manda un beso).', coins: 10 },
    { id: 'monedas10', trigger: 'Toca el contador de monedas 10 veces', message: 'Eso no da más monedas, Cuchi. Pero toma estas.', coins: 5 },
  ],
  extraWords: {},
};

let current: Content = BASE_CONTENT;
export const getContent = (): Content => current;
export function setContent(c: Partial<Content>): void {
  current = { ...BASE_CONTENT, ...c, phrases: { ...BASE_CONTENT.phrases, ...c.phrases }, finale: { ...BASE_CONTENT.finale, ...c.finale } };
}

export function phrase(kind: keyof Content['phrases']): string {
  return pick(current.phrases[kind], Math.random);
}
