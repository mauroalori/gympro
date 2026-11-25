import { useRef, useState } from 'react';
import type { Store } from '../store';
import { activeRoutine, todayISO, uid } from '../store';
import type { AppState, Exercise, Routine } from '../types';
import { RANGES, buildSeed } from '../seed';
import { formatEntry } from '../parser';
import { byChrono } from '../progression';
import ExerciseForm from './ExerciseForm';
import ExercisePicker from './ExercisePicker';
import { DEFAULT_MODEL, loadAI, saveAI } from '../ai';

function download(name: string, content: string, type: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** exporta todo en tu formato de notas */
export function exportText(s: AppState): string {
  const out: string[] = [];
  const r = activeRoutine(s);
  const done = new Set<string>();
  const exBlock = (ex: Exercise) => {
    out.push(`- ${ex.name}${ex.type !== 'core' ? ` (${ex.type})` : ''}`);
    if (ex.cue) out.push(`  Foco: ${ex.cue}`);
    for (const e of s.entries.filter((x) => x.exerciseId === ex.id).sort(byChrono)) {
      const body = e.sets.length ? formatEntry(e) : (e.raw ?? e.note ?? '');
      out.push(`-> ${e.date ? `[${e.date}] ` : ''}${body}${e.nextNote ? ` [próxima: ${e.nextNote}]` : ''}`);
    }
    out.push('');
  };
  for (const day of r?.days ?? []) {
    out.push(day.name, '');
    for (const id of day.exerciseIds) {
      const ex = s.exercises.find((e) => e.id === id);
      if (ex && !done.has(id)) {
        done.add(id);
        exBlock(ex);
      }
    }
    out.push('');
  }
  const rest = s.exercises.filter((e) => !done.has(e.id));
  if (rest.length) {
    out.push('Otros', '');
    rest.forEach(exBlock);
  }
  return out.join('\n');
}

export default function Settings({ store }: { store: Store }) {
  const { state, update, setState, updateRoutine } = store;
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [pickFor, setPickFor] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const routine = activeRoutine(state)!;

  const setActive = (id: string) => update((s) => ({ ...s, activeRoutineId: id }));
  const newRoutine = (copy?: Routine) => {
    const name = prompt('Nombre de la rutina', copy ? `${copy.name} (copia)` : 'Rutina nueva');
    if (!name) return;
    const r: Routine = copy
      ? { id: uid(), name, days: copy.days.map((d) => ({ ...d, id: uid(), exerciseIds: [...d.exerciseIds] })) }
      : { id: uid(), name, days: [] };
    update((s) => ({ ...s, routines: [...s.routines, r], activeRoutineId: r.id }));
  };
  const deleteRoutine = (r: Routine) => {
    if (state.routines.length < 2) return alert('Tiene que quedar al menos una rutina.');
    if (!confirm(`¿Borrar "${r.name}"? El historial de los ejercicios se conserva.`)) return;
    update((s) => {
      const routines = s.routines.filter((x) => x.id !== r.id);
      return { ...s, routines, activeRoutineId: s.activeRoutineId === r.id ? routines[0].id : s.activeRoutineId };
    });
  };

  const mutDays = (fn: (days: Routine['days']) => Routine['days']) => updateRoutine(routine.id, (r) => ({ ...r, days: fn(r.days) }));
  const swap = <T,>(arr: T[], i: number, j: number) => {
    if (j < 0 || j >= arr.length) return arr;
    const a = [...arr];
    [a[i], a[j]] = [a[j], a[i]];
    return a;
  };

  const saveEx = (ex: Exercise) => {
    update((s) => ({ ...s, exercises: s.exercises.map((e) => (e.id === ex.id ? ex : e)) }));
    setEditing(null);
  };
  const deleteEx = (ex: Exercise) => {
    const n = state.entries.filter((e) => e.exerciseId === ex.id).length;
    if (!confirm(`¿Borrar "${ex.name}" y sus ${n} registros de todas las rutinas?`)) return;
    update((s) => ({
      ...s,
      exercises: s.exercises.filter((e) => e.id !== ex.id),
      entries: s.entries.filter((e) => e.exerciseId !== ex.id),
      routines: s.routines.map((r) => ({ ...r, days: r.days.map((d) => ({ ...d, exerciseIds: d.exerciseIds.filter((x) => x !== ex.id) })) })),
    }));
    setEditing(null);
  };

  const importJSON = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as AppState;
      if (data.version !== 2 || !Array.isArray(data.entries)) throw new Error('formato');
      if (confirm(`Reemplazar tus datos por el backup (${data.entries.length} registros)?`)) setState(data);
    } catch {
      alert('Archivo inválido');
    }
  };

  const exName = (id: string) => state.exercises.find((e) => e.id === id)?.name ?? '?';

  return (
    <div className="page">
      <header className="page-head">
        <h1>Ajustes</h1>
      </header>

      <section className="card">
        <div className="card-title"><span>Rutinas</span></div>
        {state.routines.map((r) => (
          <div className="list-row" key={r.id}>
            <button className={`radio${r.id === routine.id ? ' on' : ''}`} onClick={() => setActive(r.id)} aria-label="Activar" />
            <input
              className="grow inline-input"
              value={r.name}
              onChange={(e) => updateRoutine(r.id, (x) => ({ ...x, name: e.target.value }))}
            />
            <button className="mini" onClick={() => newRoutine(r)} aria-label="Duplicar" title="Duplicar">⧉</button>
            <button className="mini" onClick={() => deleteRoutine(r)} aria-label="Borrar rutina">✕</button>
          </div>
        ))}
        <button className="link-btn" onClick={() => newRoutine()}>+ Nueva rutina desde cero</button>
        <p className="muted small">
          Una rutina nueva arranca vacía: agregás días y ejercicios a medida que los probás. Si elegís un ejercicio que ya existe, trae su historial.
        </p>
      </section>

      <section className="card">
        <div className="card-title"><span>Días de “{routine.name}”</span><span className="muted small">el orden es la rotación</span></div>
        {routine.days.map((d, i) => (
          <div key={d.id} className="ex-group">
            <div className="list-row">
              <span className="num-pill">{i + 1}</span>
              <input className="grow inline-input" value={d.name} onChange={(e) => mutDays((ds) => ds.map((x) => (x.id === d.id ? { ...x, name: e.target.value } : x)))} />
              <button className="mini" onClick={() => mutDays((ds) => swap(ds, i, i - 1))} aria-label="Subir día">↑</button>
              <button className="mini" onClick={() => mutDays((ds) => swap(ds, i, i + 1))} aria-label="Bajar día">↓</button>
              <button className="mini" onClick={() => confirm(`¿Quitar el día "${d.name}"?`) && mutDays((ds) => ds.filter((x) => x.id !== d.id))} aria-label="Quitar día">✕</button>
            </div>
            <div className="day-exs">
              {d.exerciseIds.map((id, j) => (
                <div className="list-row sub-row" key={id}>
                  <button className="grow text-left" onClick={() => setEditing(state.exercises.find((e) => e.id === id) ?? null)}>{exName(id)}</button>
                  <button className="mini" onClick={() => mutDays((ds) => ds.map((x) => (x.id === d.id ? { ...x, exerciseIds: swap(x.exerciseIds, j, j - 1) } : x)))} aria-label="Subir">↑</button>
                  <button className="mini" onClick={() => mutDays((ds) => ds.map((x) => (x.id === d.id ? { ...x, exerciseIds: swap(x.exerciseIds, j, j + 1) } : x)))} aria-label="Bajar">↓</button>
                  <button className="mini" onClick={() => mutDays((ds) => ds.map((x) => (x.id === d.id ? { ...x, exerciseIds: x.exerciseIds.filter((y) => y !== id) } : x)))} aria-label="Quitar del día">✕</button>
                </div>
              ))}
              <button className="link-btn" onClick={() => setPickFor(d.id)}>+ Agregar ejercicio</button>
            </div>
          </div>
        ))}
        <button
          className="link-btn"
          onClick={() => {
            const name = prompt('Nombre del día');
            if (name) mutDays((ds) => [...ds, { id: uid(), name, exerciseIds: [] }]);
          }}
        >
          + Agregar día
        </button>
      </section>

      <section className="card">
        <div className="card-title"><span>Biblioteca de ejercicios</span><span className="muted small">{state.exercises.length}</span></div>
        <p className="muted small">
          Aislamiento: {RANGES.aislamiento[0]}–{RANGES.aislamiento[1]} repes · Compuesto: {RANGES.compuesto[0]}–{RANGES.compuesto[1]} repes. Al llegar al tope del rango
          la app sugiere subir el peso y volver al mínimo. Tocá un ejercicio para cambiar rango, salto de peso o foco.
        </p>
        <details>
          <summary className="muted small">Ver todos</summary>
          {[...state.exercises].sort((a, b) => a.name.localeCompare(b.name)).map((ex) => (
            <div className="list-row" key={ex.id}>
              <button className="grow text-left" onClick={() => setEditing(ex)}>
                {ex.name}
                <span className="muted small"> · {ex.type === 'core' ? 'core' : `${ex.type} ${ex.repMin}–${ex.repMax}, +${ex.increment}kg`}</span>
              </button>
            </div>
          ))}
        </details>
      </section>

      <section className="card">
        <div className="card-title"><span>Movilidad y hábitos</span></div>
        {state.habits.map((h) => (
          <div className="list-row" key={h.id}>
            <span className="grow">{h.name} <span className="muted small">· {h.dose}</span></span>
            <button className="mini" onClick={() => update((s) => ({ ...s, habits: s.habits.filter((x) => x.id !== h.id) }))} aria-label="Quitar">✕</button>
          </div>
        ))}
        <button
          className="link-btn"
          onClick={() => {
            const name = prompt('Nombre (ej: Estiramiento de pecho)');
            if (!name) return;
            const dose = prompt('Dosis (ej: 2x30 s)') ?? '';
            update((s) => ({ ...s, habits: [...s.habits, { id: uid(), name, kind: 'Movilidad', dose }] }));
          }}
        >
          + Agregar
        </button>
      </section>

      <AISettings />

      <section className="card">
        <div className="card-title"><span>Datos y backup</span></div>
        <p className="muted small">Los datos se guardan en este dispositivo. Exportá un backup de vez en cuando.</p>
        <div className="btn-col">
          <button className="btn" onClick={() => download(`gympro-backup-${todayISO()}.json`, JSON.stringify(state, null, 1), 'application/json')}>
            Exportar backup (JSON)
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Importar backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])} />
          <button className="btn" onClick={() => download(`gympro-${todayISO()}.txt`, exportText(state), 'text/plain')}>
            Exportar como texto (tu formato)
          </button>
          <button className="btn danger" onClick={() => confirm('¿Borrar todo y volver al historial original importado?') && setState(buildSeed())}>
            Restablecer al historial original
          </button>
        </div>
      </section>

      {editing && <ExerciseForm ex={editing} onSave={saveEx} onCancel={() => setEditing(null)} onDelete={deleteEx} />}
      {pickFor && (
        <ExercisePicker
          state={state}
          exclude={routine.days.find((d) => d.id === pickFor)?.exerciseIds ?? []}
          onCancel={() => setPickFor(null)}
          onPick={(ex, isNew) => {
            update((s) => ({
              ...s,
              exercises: isNew ? [...s.exercises, ex] : s.exercises,
              routines: s.routines.map((r) =>
                r.id !== routine.id ? r : { ...r, days: r.days.map((d) => (d.id === pickFor ? { ...d, exerciseIds: [...d.exerciseIds, ex.id] } : d)) }
              ),
            }));
            setPickFor(null);
          }}
        />
      )}
    </div>
  );
}

function AISettings() {
  const [cfg, setCfg] = useState(loadAI);
  const [show, setShow] = useState(false);
  const set = (p: Partial<typeof cfg>) => {
    const n = { ...cfg, ...p };
    setCfg(n);
    saveAI(n);
  };
  return (
    <section className="card" id="ia">
      <div className="card-title">
        <span>Consejo IA (Gemini)</span>
        <span className={`badge ${cfg.apiKey ? 'aislamiento' : ''}`}>{cfg.apiKey ? 'activo' : 'inactivo'}</span>
      </div>
      <ol className="steps small">
        <li>
          Entrá a{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
            aistudio.google.com/apikey
          </a>{' '}
          con tu cuenta de Google.
        </li>
        <li>Tocá “Create API key” y copiala. Es gratis, no pide tarjeta.</li>
        <li>Pegala acá abajo.</li>
      </ol>
      <label className="field">
        <span>API key</span>
        <div className="row gap">
          <input
            className="grow"
            type={show ? 'text' : 'password'}
            autoComplete="off"
            placeholder="AIza…"
            value={cfg.apiKey}
            onChange={(e) => set({ apiKey: e.target.value.trim() })}
          />
          <button type="button" className="mini" onClick={() => setShow((v) => !v)} aria-label="Mostrar clave">{show ? '🙈' : '👁'}</button>
        </div>
      </label>
      <label className="field">
        <span>Modelo</span>
        <input value={cfg.model} placeholder={DEFAULT_MODEL} onChange={(e) => set({ model: e.target.value.trim() || DEFAULT_MODEL })} />
      </label>
      <p className="muted small">
        La clave queda guardada solo en este teléfono y no viaja en el backup. Cada consulta manda a Google las últimas sesiones de ese ejercicio, tus notas y el
        dolor lumbar. En el plan gratis Google puede usar esos datos para mejorar sus modelos.
      </p>
    </section>
  );
}
