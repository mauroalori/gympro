import { useCallback, useEffect, useState } from 'react';
import type { AppState, Entry, Routine } from './types';
import { buildSeed } from './seed';

const KEY = 'gympro:v2';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as AppState;
      if (s && s.version === 2 && Array.isArray(s.entries)) return s;
    }
  } catch {
    /* sin storage disponible */
  }
  return buildSeed();
}

export function saveState(s: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function useAppState() {
  const [state, setState] = useState<AppState>(loadState);
  useEffect(() => saveState(state), [state]);
  useEffect(() => {
    // pedir al navegador que no borre los datos
    navigator.storage?.persist?.().catch(() => {});
  }, []);

  const update = useCallback((fn: (s: AppState) => AppState) => setState((s) => fn(s)), []);

  const upsertEntry = useCallback(
    (entry: Entry) =>
      update((s) => {
        const exists = s.entries.some((e) => e.id === entry.id);
        return { ...s, entries: exists ? s.entries.map((e) => (e.id === entry.id ? entry : e)) : [...s.entries, entry] };
      }),
    [update]
  );
  const deleteEntry = useCallback(
    (id: string) => update((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) })),
    [update]
  );
  const updateRoutine = useCallback(
    (id: string, fn: (r: Routine) => Routine) =>
      update((s) => ({ ...s, routines: s.routines.map((r) => (r.id === id ? fn(r) : r)) })),
    [update]
  );

  return { state, setState, update, upsertEntry, deleteEntry, updateRoutine };
}

export type Store = ReturnType<typeof useAppState>;

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function fmtDate(iso?: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export const activeRoutine = (s: AppState): Routine | undefined =>
  s.routines.find((r) => r.id === s.activeRoutineId) ?? s.routines[0];

/** día sugerido según la rotación de la rutina activa y el último día entrenado */
export function suggestedDay(s: AppState): { dayId?: string; reason: string } {
  const r = activeRoutine(s);
  if (!r || !r.days.length) return { reason: 'Creá el primer día de la rutina' };
  const today = todayISO();
  const dated = s.entries.filter((e) => e.date && e.dayId && r.days.some((d) => d.id === e.dayId)).sort((a, b) => a.seq - b.seq);
  const last = dated[dated.length - 1];
  if (!last) return { dayId: r.days[0].id, reason: 'Arrancá la rotación' };
  if (last.date === today) return { dayId: last.dayId, reason: 'Ya entrenaste hoy' };
  const idx = r.days.findIndex((d) => d.id === last.dayId);
  const next = r.days[(idx + 1) % r.days.length];
  return { dayId: next.id, reason: `Último: ${r.days[idx].name} (${fmtDate(last.date)})` };
}
