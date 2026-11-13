import { fromJson, type Template, type TemplateJson } from './model';

/**
 * Dibujos y recuerdos PERSONALES (fotos vuestras). Viven en la carpeta "private/", que esta en .gitignore:
 * nunca se suben al repositorio. Se generan con scripts/import-photos.mjs. Si la carpeta no existe, no pasa nada.
 * En la version publicada se usan desde Supabase (panel de Nico > "Subir mis dibujos a la nube").
 */
const files = import.meta.glob('../../private/*.json', { eager: true, import: 'default' }) as Record<string, TemplateJson>;

export const privateJson = (): TemplateJson[] => Object.values(files);
export const privateTemplates = (): Template[] => privateJson().map(j => ({ ...fromJson(j), source: 'builtin' as const }));
