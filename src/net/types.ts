import type { AvatarCfg } from '../avatar/avatar';
import type { Role } from '../core/state';
import type { PaintOp, TemplateJson } from '../paint/model';
import type { Content } from '../data/content';

export interface Snapshot {
  role: Role;
  totalStars: number;
  levelsDone: number;
  wordsFound: number;
  achievements: string[];
  streak: number;
  paintDone: string[];
  vouchers: string[];
  avatar?: AvatarCfg;
  updated: number;
  weekId?: string;      // reto semanal de pareja
  weekWords?: number;
}

export type MessageKind = 'quick' | 'letter' | 'voucher' | 'system';
export interface Message {
  id: string;
  from: Role;
  to: Role;
  kind: MessageKind;
  body: string;
  deliverAt: number;      // ms epoch; las cartas programadas llegan en esta fecha
  createdAt: number;
  readAt: number | null;
}

export interface PushSub { endpoint: string; p256dh: string; auth: string }

export interface PhotoRef { path: string; url: string }

export interface Backend {
  readonly mode: 'local' | 'supabase';
  /** Intenta recuperar la sesion guardada. */
  restore(): Promise<Role | null>;
  login(name: Role, code: string): Promise<{ ok: true; role: Role } | { ok: false; error: string }>;
  logout(): Promise<void>;

  pushSnapshot(s: Snapshot): Promise<void>;
  pullPartner(): Promise<Snapshot | null>;

  /** Suma `delta` a la cartera compartida y devuelve el total. */
  addCoins(delta: number): Promise<number>;
  getCoins(): Promise<number>;

  loadContent(): Promise<Partial<Content> & { romaUnlocked?: boolean }>;
  saveContent(c: Partial<Content> & { romaUnlocked?: boolean }): Promise<void>;
  loadTemplates(): Promise<TemplateJson[]>;
  saveTemplate(t: TemplateJson): Promise<void>;
  deleteTemplate(id: string): Promise<void>;

  uploadPhoto(blob: Blob, name: string): Promise<PhotoRef>;
  /** URL temporal para ver una foto guardada (ruta -> url). */
  photoUrl(path: string): Promise<string>;
  listPhotos(): Promise<PhotoRef[]>;

  sendPaintOp(imageId: string, op: PaintOp): Promise<void>;
  loadPaintOps(imageId: string): Promise<PaintOp[]>;
  /** Devuelve funcion para cancelar la suscripcion. */
  subscribePaint(imageId: string, cb: (op: PaintOp) => void): () => void;

  sendMessage(m: Omit<Message, 'id' | 'createdAt' | 'readAt'>): Promise<void>;
  listMessages(): Promise<Message[]>;
  markRead(ids: string[]): Promise<void>;
  subscribeMessages(cb: () => void): () => void;

  savePushSub(sub: PushSub): Promise<void>;

  /** Sala en directo de la pareja: mensajes al instante y quien esta conectado. */
  joinLive(onMsg: (m: unknown, from: Role) => void, onPeers: (peers: Role[]) => void): { send(m: unknown): void; leave(): void };
}

export class PermanentError extends Error {
  readonly permanent = true;
}
