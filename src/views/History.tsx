import type { Store } from '../store';
import { activeRoutine, fmtDate } from '../store';
import type { Exercise } from '../types';
import { e1rm, entriesFor, topSet } from '../progression';
import { fmtNum } from '../parser';
import { TypeBadge } from '../components';
import { navigate } from '../App';

export default function History({ store }: { store: Store }) {
  const { state } = store;
  const routine = activeRoutine(state);
  const inRoutine = new Set(routine?.days.flatMap((d) => d.exerciseIds));
  const others = state.exercises.filter((e) => !inRoutine.has(e.id));
  const totalSessions = new Set(state.entries.filter((e) => e.date).map((e) => e.date)).size;
  const pains = Object.entries(state.daily)
    .filter(([, d]) => d.pain !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-21);

  const row = (ex: Exercise) => {
    const list = entriesFor(state.entries, ex.id);
    const withW = list.filter((e) => e1rm(e.sets) !== undefined);
    const last = withW[withW.length - 1];
    const first = withW[0];
    const delta = last && first && withW.length > 1 ? e1rm(last.sets)! - e1rm(first.sets)! : undefined;
    const top = last ? topSet(last.sets) : undefined;
    return (
      <li key={ex.id}>
        <button className="hist-row" onClick={() => navigate(`/ex/${ex.id}`)}>
          <div className="grow">
            <div className="ex-name">{ex.name}</div>
            <div className="muted small">
              <TypeBadge ex={ex} /> {list.length} sesiones
            </div>
          </div>
          <div className="hist-right">
            {top && <div className="hist-top">{fmtNum(top.weight!)}×{top.reps}</div>}
            {delta !== undefined && (
              <div className={`delta ${delta >= 0 ? 'up' : 'down'}`}>
                {delta >= 0 ? '+' : ''}
                {fmtNum(Math.round(delta * 10) / 10)} kg 1RM
              </div>
            )}
          </div>
        </button>
      </li>
    );
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1>Progreso</h1>
        <div className="sub">
          {state.entries.length} registros · {totalSessions} días registrados en la app
        </div>
      </header>

      {pains.length > 0 && (
        <section className="card">
          <div className="card-title"><span>Dolor lumbar</span><span className="muted small">últimos {pains.length} registros</span></div>
          <div className="pain-bars">
            {pains.map(([date, d]) => (
              <div key={date} className="pain-bar" title={`${fmtDate(date)}: ${d.pain}`}>
                <span style={{ height: `${Math.max(4, d.pain! * 10)}%` }} className={`p${Math.min(3, Math.floor(d.pain! / 3))}`} />
                <small>{d.pain}</small>
              </div>
            ))}
          </div>
        </section>
      )}

      {routine?.days.map((day) => {
        const exs = day.exerciseIds.map((id) => state.exercises.find((e) => e.id === id)!).filter(Boolean);
        if (!exs.length) return null;
        return (
          <section key={day.id} className="group">
            <h2>{day.name}</h2>
            <ul className="hist-list">{exs.map(row)}</ul>
          </section>
        );
      })}
      {others.length > 0 && (
        <section className="group">
          <h2>Fuera de la rutina activa</h2>
          <ul className="hist-list">{others.map(row)}</ul>
        </section>
      )}
    </div>
  );
}
