import type { Entry, SetEntry } from './types';

/**
 * Parser de la notación que usás en tus notas:
 *   "50x10 MVC segunda 50x9 MVC (nota) mitad 50x7 ultima 44x10 MVC"
 *   "dominadas -> x7 MVC segunda x5"   (variante + peso corporal)
 *   "25x3-20x6 MVC"                     (drop set)
 */

export interface ParsedLine {
  sets: SetEntry[];
  note?: string;
  variant?: string;
}

export const parseNum = (s: string) => parseFloat(s.replace(',', '.'));

const TOKEN =
  /(§(\d+)§)|(?<![\p{L}])(MVC|al fallo)(?![\p{L}])|(?<![\p{L}])(primera|segunda|tercera|cuarta|quinta|mitad|[uú]ltima)(?![\p{L}])|(\d+(?:[.,]\d+)?)\s?(?:kg)?\s?x\s?(\d+)?|(?<![\p{L}\d])x\s?(\d+)/giu;

const SET_TEST = /\d\s?(?:kg)?\s?x|(?<![\p{L}\d])x\s?\d/iu;

function clean(s: string) {
  return s.replace(/§\d+§/g, ' ').replace(/\s+/g, ' ').trim();
}

export function parseLine(input: string): ParsedLine {
  let text = input.trim().replace(/^->\s*/, '');
  const notes: string[] = [];
  text = text.replace(/\(([^)]*)\)?/g, (_m, n: string) => {
    notes.push(n.trim());
    return ` §${notes.length - 1}§ `;
  });

  let variant: string | undefined;
  const arrow = text.indexOf('->');
  if (arrow >= 0) {
    const before = clean(text.slice(0, arrow));
    if (!SET_TEST.test(before) && before.split(' ').length <= 3) {
      variant = before || undefined;
      text = text.slice(arrow + 2);
    }
  }

  const sets: SetEntry[] = [];
  const entryNotes: string[] = [];
  let pendingLabel: { norm: string; raw: string } | undefined;
  let last = 0;
  let lastBetween = '';

  // textos sueltos consecutivos (sin series en el medio) se unen en una sola frase
  let looseRun = false;
  const addLoose = (s: string) => {
    const t = clean(s).replace(/^[-.,;:\s>]+|[-.,;:\s]+$/g, '');
    if (!/[\p{L}\d]/u.test(t)) return;
    const piece = pendingLabel ? `${pendingLabel.raw} ${t}` : t;
    pendingLabel = undefined;
    if (looseRun && entryNotes.length) entryNotes[entryNotes.length - 1] += ` ${piece}`;
    else entryNotes.push(piece);
    looseRun = true;
  };

  for (const m of text.matchAll(TOKEN)) {
    const between = text.slice(last, m.index);
    lastBetween = between;
    addLoose(between);
    last = m.index! + m[0].length;

    if (m[1]) {
      const note = notes[Number(m[2])];
      if (!note) continue;
      const target = sets[sets.length - 1];
      if (target) target.note = target.note ? `${target.note}; ${note}` : note;
      else entryNotes.push(note);
    } else if (m[3]) {
      const target = sets[sets.length - 1];
      if (target) target.mvc = true;
    } else if (m[4]) {
      pendingLabel = { norm: m[4].toLowerCase().replace('ú', 'u'), raw: m[4] };
    } else if (m[5]) {
      looseRun = false;
      const set: SetEntry = { weight: parseNum(m[5]) };
      if (m[6]) set.reps = parseInt(m[6], 10);
      if (pendingLabel) set.label = pendingLabel.norm;
      else if (sets.length && lastBetween.trim() === '-') set.label = 'drop';
      pendingLabel = undefined;
      sets.push(set);
    } else if (m[7]) {
      looseRun = false;
      const set: SetEntry = { reps: parseInt(m[7], 10) };
      if (pendingLabel) set.label = pendingLabel.norm;
      pendingLabel = undefined;
      sets.push(set);
    }
  }
  addLoose(text.slice(last));

  const note = entryNotes.join(' · ') || undefined;
  return { sets, note, variant };
}

export const fmtNum = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

export function fmtSet(s: SetEntry): string {
  const w = s.weight !== undefined ? fmtNum(s.weight) : '';
  const r = s.reps !== undefined ? String(s.reps) : '';
  return `${w}x${r}${s.mvc ? ' MVC' : ''}`;
}

/** etiquetas posicionales como las escribís vos */
export function positionalLabels(n: number): string[] {
  if (n <= 1) return [''];
  if (n === 2) return ['', 'ultima'];
  if (n === 3) return ['', 'mitad', 'ultima'];
  if (n === 4) return ['', 'segunda', 'mitad', 'ultima'];
  const ord = ['', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima'];
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? 'ultima' : ord[i] ?? `serie ${i + 1}`));
}

/** vuelve a escribir un registro en tu notación de texto */
export function formatEntry(e: Pick<Entry, 'sets' | 'note' | 'variant'>): string {
  const labels = positionalLabels(e.sets.length);
  const parts = e.sets.map((s, i) => {
    const label = s.label === 'drop' ? '-' : i === 0 ? '' : (s.label ?? labels[i]);
    let t = fmtSet(s);
    if (s.note) t += ` (${s.note})`;
    if (label === '-') return `-${t}`;
    return label ? `${label} ${t}` : t;
  });
  let out = parts.join(' ').replace(/ -/g, '-');
  if (e.variant) out = `${e.variant} -> ${out}`;
  if (e.note) out = out ? `${out} (${e.note})` : e.note;
  return out;
}
