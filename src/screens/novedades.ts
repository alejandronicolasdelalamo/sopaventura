import { update } from '../core/state';
import { NEWS_TOPICS, openGuide, TOPICS } from '../ui/info';

/** Tutorial corto de las novedades, con Olaf (palabras extra, tipos de nivel, modos, ayudas). Se puede ir hacia atras. Se marca como visto al cerrarlo. */
export function showNews(): void {
  const pages = NEWS_TOPICS.flatMap(t => TOPICS[t].pages);
  openGuide(pages, { dismissable: false, onClose: () => update(s => { s.settings.newsSeen = true; }) });
}
