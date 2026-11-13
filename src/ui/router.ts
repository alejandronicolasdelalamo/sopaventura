type Dispose = void | (() => void);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Render = (root: HTMLElement, params: any) => Dispose;

const routes = new Map<string, Render>();
const stack: { name: string; params: unknown }[] = [];
let root: HTMLElement;
let dispose: Dispose;

export function initRouter(el: HTMLElement): void { root = el; }
export function register(name: string, fn: Render): void { routes.set(name, fn); }

function show(name: string, params: unknown): void {
  const fn = routes.get(name);
  if (!fn) throw new Error(`Pantalla desconocida: ${name}`);
  if (typeof dispose === 'function') dispose();
  root.innerHTML = '';
  dispose = fn(root, params);
}

export function navigate(name: string, params: unknown = {}, replace = false): void {
  if (replace) stack.pop();
  stack.push({ name, params });
  show(name, params);
}

/** Vuelve a la pantalla anterior (o al inicio si no hay). */
export function back(): void {
  stack.pop();
  const prev = stack[stack.length - 1] ?? { name: 'home', params: {} };
  if (!stack.length) stack.push(prev);
  show(prev.name, prev.params);
}

export const currentRoute = () => stack[stack.length - 1]?.name;
