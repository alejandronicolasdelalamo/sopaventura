import { backend } from '../net';

/** Una foto-recuerdo puede ser un data URL (carpeta private/) o una ruta del almacenamiento privado (Supabase). */
export async function photoSrc(photo: string): Promise<string> {
  if (photo.startsWith('data:') || photo.startsWith('blob:')) return photo;
  return backend.photoUrl(photo);
}

export function polaroid(photo: string, caption = 'Recuerdo desbloqueado'): HTMLElement {
  const fr = document.createElement('div');
  fr.className = 'polaroid';
  const im = document.createElement('img');
  im.alt = 'Recuerdo'; im.width = 240;
  void photoSrc(photo).then(u => { im.src = u; }).catch(() => { fr.hidden = true; });
  const cap = document.createElement('small');
  cap.textContent = caption;
  fr.append(im, cap);
  return fr;
}
