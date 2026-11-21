import { useState } from 'react';
import type { Store } from '../store';
import { activeRoutine, fmtDate, suggestedDay, todayISO, uid } from '../store';
import { entriesFor, hintsFor, suggest } from '../progression';
import { SetChips, SuggestionBox, TypeBadge, entryLabel } from '../components';
import { navigate } from '../App';
import ExercisePicker from './ExercisePicker';

export default function Today({ store, dayId, setDayId }: { store: Store; dayId?: string; setDayId: (d: string) => void }) {
  const { state, update, updateRoutine } = store;
  const [picking, setPicking] = useState(false);
  const today = todayISO();
  const routine = activeRoutine(state);
  const sug = suggestedDay(state);
  const day = routine?.days.find((d) => d.id === dayId) ?? routine?.days.find((d) => d.id === sug.dayId);
  const exercises = (day?.exerciseIds ?? []).map((id) => state.exercises.find((e) => e.id === id)!).filter(Boolean);
  const doneCount = exercises.filter((ex) => state.entries.some((e) => e.exerciseId === ex.id && e.date === today)).length;

  const addDay = () => {
    const name = prompt('Nombre del día (ej: Piernas)');
    if (!name || !routine) return;
    const id = uid();
    updateRoutine(routine.id, (r) => ({ ...r, days: [...r.days, { id, name, exerciseIds: [] }] }));
    setDayId(id);
  };

  if (!routine) return null;

  return (
    <div className="page">
      <header className="page-head">
        <div className="eyebrow">
          {fmtDate(today)} · <a href="#/settings">{routine.name}</a>
        </div>
        <h1>{day?.name ?? 'Rutina vacía'}</h1>
        {day && (
          <div className="sub">
            {day.id === sug.dayId ? `Sugerido · ${sug.reason}` : `Sugerido hoy: ${routine.days.find((d) => d.id === sug.dayId)?.name}`}
            {doneCount > 0 && ` · ${doneCount}/${exercises.length} hechos`}
          </div>
        )}
      </header>

      <div className="day-chips" role="tablist">
        {routine.days.map((d, i) => (
          <button key={d.id} role="tab" aria-selected={d.id === day?.id} className={d.id === day?.id ? 'on' : ''} onClick={() => setDayId(d.id)}>
            <span className="num">{i + 1}</span>
            {d.name.split(' ')[0]}
            {d.id === sug.dayId && <span className="dot" />}
          </button>
        ))}
        <button onClick={addDay} aria-label="Agregar día">+ Día</button>
      </div>

      {!day && (
        <p className="empty">
          Esta rutina todavía no tiene días. Creá el primero y andá sumando ejercicios a medida que los vayas probando.
        </p>
      )}

      {day && (
        <ul className="ex-list">
          {exercises.map((ex) => {
            const list = entriesFor(state.entries, ex.id);
            const done = list.filter((e) => e.date === today).pop();
            const prev2 = list.filter((e) => e !== done).slice(-2).reverse();
            const s = suggest(ex, list, done?.id);
            const hint = hintsFor(list, done?.id)[0];
            return (
              <li key={ex.id}>
                <button className={`ex-card${done ? ' done' : ''}`} onClick={() => navigate(`/log/${ex.id}`)}>
                  <div className="ex-card-head">
                    <span className="ex-name">{ex.name}</span>
                    {done ? <span className="check">✓ hecho</span> : <TypeBadge ex={ex} />}
                  </div>
                  {done ? (
                    ex.type === 'core' || !done.sets.length ? <div className="entry-raw">{done.raw}</div> : <SetChips sets={done.sets} />
                  ) : (
                    <>
                      {ex.type !== 'core' && <SuggestionBox s={s} compact />}
                      {prev2.length > 0 ? (
                        <div className="prev2">
                          {prev2.map((e) => (
                            <div className="last" key={e.id}>
                              <span className="muted when">{entryLabel(e, list.indexOf(e) + 1)}</span>
                              {ex.type === 'core' || !e.sets.length ? <span>{e.raw}</span> : <SetChips sets={e.sets} />}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="muted small">Ejercicio nuevo: elegí un peso cómodo y anotá cómo se sintió.</div>
                      )}
                      {hint && <div className={`hint-line${hint.explicit ? ' explicit' : ''}`}>💬 {hint.text}</div>}
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {day && (
        <button className="btn dashed" onClick={() => setPicking(true)}>
          + Agregar ejercicio a {day.name}
        </button>
      )}

      <DailyCard store={store} />

      {picking && day && (
        <ExercisePicker
          state={state}
          exclude={day.exerciseIds}
          onCancel={() => setPicking(false)}
          onPick={(ex, isNew) => {
            update((s) => ({
              ...s,
              exercises: isNew ? [...s.exercises, ex] : s.exercises,
              routines: s.routines.map((r) =>
                r.id !== routine.id ? r : { ...r, days: r.days.map((d) => (d.id === day.id ? { ...d, exerciseIds: [...d.exerciseIds, ex.id] } : d)) }
              ),
            }));
            setPicking(false);
            if (isNew) navigate(`/log/${ex.id}`);
          }}
        />
      )}
    </div>
  );
}

function DailyCard({ store }: { store: Store }) {
  const { state, update } = store;
  const today = todayISO();
  const log = state.daily[today] ?? {};
  const [openHow, setOpenHow] = useState<string | null>(null);
  const setLog = (p: Partial<typeof log>) => update((s) => ({ ...s, daily: { ...s.daily, [today]: { ...s.daily[today], ...p } } }));
  const done = new Set(log.habits ?? []);
  const toggle = (id: string) => {
    const n = new Set(done);
    n.has(id) ? n.delete(id) : n.add(id);
    setLog({ habits: [...n] });
  };
  return (
    <>
      <section className="card">
        <div className="card-title"><span>Dolor lumbar hoy (0–10)</span>{log.pain !== undefined && <span className={`pain-val p${Math.min(3, Math.floor(log.pain / 3))}`}>{log.pain}</span>}</div>
        <div className="pain-scale">
          {Array.from({ length: 11 }, (_, i) => (
            <button key={i} className={log.pain === i ? 'on' : ''} onClick={() => setLog({ pain: log.pain === i ? undefined : i })}>{i}</button>
          ))}
        </div>
        <p className="muted small">Hasta 3 y que baje en 24 h: seguí. Si sube o queda, bajá la carga.</p>
      </section>
      {state.habits.length > 0 && (
        <details className="card">
          <summary>
            Movilidad y hábitos <span className="muted small">· {done.size}/{state.habits.length} hoy</span>
          </summary>
          <div className="habits">
            {state.habits.map((h) => (
              <div key={h.id} className={`habit${done.has(h.id) ? ' on' : ''}`}>
                <button className="habit-check" onClick={() => toggle(h.id)} aria-label={`Marcar ${h.name}`}>{done.has(h.id) ? '✓' : ''}</button>
                <button className="grow text-left" onClick={() => setOpenHow(openHow === h.id ? null : h.id)}>
                  <div className="habit-name">{h.name}</div>
                  <div className="muted small">{h.dose}</div>
                  {openHow === h.id && h.how && <div className="small habit-how">{h.how}</div>}
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
