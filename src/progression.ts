import type { Entry, Exercise, SetEntry } from './types';
import { fmtNum } from './parser';

export interface Suggestion {
  kind: 'subir' | 'mantener' | 'bajar' | 'nuevo' | 'libre';
  title: string;
  detail: string;
  weight?: number;
  reps?: number;
}

export const isValidSet = (s: SetEntry) => s.reps !== undefined && s.reps > 0;

/** serie más pesada; a igual peso, la de más repes */
export function topSet(sets: SetEntry[]): SetEntry | undefined {
  let best: SetEntry | undefined;
  for (const s of sets) {
    if (!isValidSet(s)) continue;
    const w = s.weight ?? 0;
    const bw = best?.weight ?? 0;
    if (!best || w > bw || (w === bw && s.reps! > best.reps!)) best = s;
  }
  return best;
}

/** 1RM estimado (Epley) de la mejor serie */
export function e1rm(sets: SetEntry[]): number | undefined {
  let best: number | undefined;
  for (const s of sets) {
    if (!isValidSet(s) || s.weight === undefined || s.weight <= 0) continue;
    const v = s.weight * (1 + s.reps! / 30);
    if (best === undefined || v > best) best = v;
  }
  return best;
}

export function volume(sets: SetEntry[]): number {
  return sets.reduce((acc, s) => acc + (isValidSet(s) ? (s.weight ?? 0) * s.reps! : 0), 0);
}

export const byChrono = (a: Entry, b: Entry) => a.seq - b.seq;

export function entriesFor(entries: Entry[], exerciseId: string): Entry[] {
  return entries.filter((e) => e.exerciseId === exerciseId).sort(byChrono);
}

/** último registro con series válidas (opcionalmente de una variante, excluyendo uno) */
export function lastValid(list: Entry[], opts: { variant?: string | null; excludeId?: string } = {}) {
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i];
    if (e.id === opts.excludeId) continue;
    if (opts.variant !== undefined && (e.variant ?? null) !== opts.variant) continue;
    if (topSet(e.sets)) return e;
  }
  return undefined;
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

/**
 * Doble progresión:
 *  - mejor serie del peso tope llega al máximo del rango -> subís peso y volvés al mínimo
 *  - dentro del rango -> mismo peso, +1 repe
 *  - por debajo del mínimo -> mantener (o bajar si quedó muy lejos)
 */
export function suggest(ex: Exercise, list: Entry[], excludeId?: string): Suggestion {
  if (ex.type === 'core') {
    const last = [...list].reverse().find((e) => e.id !== excludeId);
    return {
      kind: 'libre',
      title: last ? 'Repetí o superá la última' : 'Primera vez',
      detail: last ? 'Sumá segundos o repes cuando salga cómodo.' : 'Arrancá con algo cómodo y técnica limpia.',
    };
  }
  const lastAny = [...list].reverse().find((e) => e.id !== excludeId && topSet(e.sets));
  const last = lastAny ? lastValid(list, { variant: lastAny.variant ?? null, excludeId }) : undefined;
  if (!last) {
    return {
      kind: 'nuevo',
      title: 'Sin registros todavía',
      detail: `Buscá un peso con el que llegues a ${ex.repMin}–${ex.repMax} repes con buena técnica.`,
    };
  }
  const top = topSet(last.sets)!;
  const reps = top.reps!;
  const { repMin, repMax } = ex;

  if (top.weight === undefined || top.weight === 0) {
    if (reps >= repMax)
      return { kind: 'subir', title: 'Agregá dificultad', detail: `Llegaste a ${reps}: sumá lastre o una variante más difícil.`, reps: repMin };
    return { kind: 'mantener', title: `Buscá x${reps + 1}`, detail: `Última mejor serie: x${reps}.`, reps: reps + 1 };
  }

  const w = top.weight;
  if (reps >= repMax) {
    const next = roundTo(w + ex.increment, 0.25);
    return {
      kind: 'subir',
      title: `Subí a ${fmtNum(next)} kg × ${repMin}`,
      detail: `Hiciste ${fmtNum(w)}×${reps}: llegaste al tope del rango (${repMax}).`,
      weight: next,
      reps: repMin,
    };
  }
  if (reps < repMin) {
    if (reps <= repMin - 3) {
      const lower = Math.max(0, roundTo(w - ex.increment, 0.25));
      return {
        kind: 'bajar',
        title: `Bajá a ${fmtNum(lower)} kg`,
        detail: `${fmtNum(w)}×${reps} quedó lejos del mínimo (${repMin}). Consolidá técnica.`,
        weight: lower,
        reps: repMin,
      };
    }
    return {
      kind: 'mantener',
      title: `${fmtNum(w)} kg × ${repMin}`,
      detail: `Hiciste ${fmtNum(w)}×${reps}: mantené el peso hasta llegar al mínimo (${repMin}).`,
      weight: w,
      reps: repMin,
    };
  }
  return {
    kind: 'mantener',
    title: `${fmtNum(w)} kg × ${reps + 1}`,
    detail: `Hiciste ${fmtNum(w)}×${reps}. ${repMax - reps === 1 ? 'Falta 1 repe' : `Faltan ${repMax - reps} repes`} para subir peso.`,
    weight: w,
    reps: reps + 1,
  };
}

export interface Hint {
  text: string;
  /** escrita explícitamente como "para la próxima" */
  explicit: boolean;
  from: Entry;
}

const NEXT_RX = /pr[oó]x|buscar|mantener|seguir|arrancar|puedo (subir|pasar|volver|arrancar|empezar)|tengo que|bajar|subir|empezar|no subir|quedar|probar|ojo/i;

/**
 * Recordatorios para la próxima vez sacados de las 2 últimas sesiones:
 * la nota "para la próxima" explícita + las notas que hablan de qué hacer después.
 */
export function hintsFor(list: Entry[], excludeId?: string, max = 2): Hint[] {
  const recent = list.filter((e) => e.id !== excludeId).slice(-max).reverse();
  const out: Hint[] = [];
  const seen = new Set<string>();
  const push = (text: string | undefined, explicit: boolean, from: Entry) => {
    const t = text?.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push({ text: t, explicit, from });
  };
  for (const e of recent) {
    push(e.nextNote, true, e);
    const notes = [...e.sets.map((s) => s.note), e.note];
    for (const n of notes) if (n && NEXT_RX.test(n)) push(n, false, e);
  }
  return out;
}
