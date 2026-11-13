/** Normaliza a MAYUSCULAS sin tildes ni espacios, conservando la Ñ. */
export function norm(s: string): string {
  return s
    .toUpperCase()
    .replace(/Ñ/g, '\u0001')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\u0001/g, 'Ñ')
    .replace(/[^A-ZÑ]/g, '');
}
