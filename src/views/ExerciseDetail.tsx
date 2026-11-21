import { useState } from 'react';
import type { Store } from '../store';
import ExerciseForm from './ExerciseForm';
import { e1rm, entriesFor, suggest } from '../progression';
import { fmtNum, formatEntry } from '../parser';
import { EntryView, ProgressChart, SuggestionBox, TypeBadge } from '../components';
import { navigate } from '../App';

export default function ExerciseDetail({ store, exId }: { store: Store; exId: string }) {
  const { state, deleteEntry, update } = store;
  const [editing, setEditing] = useState(false);
  const ex = state.exercises.find((e) => e.id === exId);
  if (!ex) return <div className="page"><p className="empty">Ejercicio no encontrado.</p></div>;
  const list = entriesFor(state.entries, ex.id);
  const variants = [...new Set(list.map((e) => e.variant ?? ''))];
  const best = list.reduce<number | undefined>((b, e) => {
    const v = e1rm(e.sets);
    return v !== undefined && (b === undefined || v > b) ? v : b;
  }, undefined);

  const copyText = async () => {
    const txt = `- ${ex.name}\n` + list.map((e) => `-> ${e.sets.length ? formatEntry(e) : (e.raw ?? e.note ?? '')}${e.nextNote ? ` [próxima: ${e.nextNote}]` : ''}`).join('\n');
    try {
      await navigator.clipboard.writeText(txt);
      alert('Historial copiado al portapapeles');
    } catch {
      prompt('Copiá el historial:', txt);
    }
  };

  return (
    <div className="page">
      <header className="page-head row">
        <button className="back" onClick={() => (window.history.length > 1 ? window.history.back() : navigate('/history'))} aria-label="Volver">‹</button>
        <div className="grow">
          <h1 className="h-ex">{ex.name}</h1>
          <div className="sub"><TypeBadge ex={ex} /> {list.length} sesiones</div>
        </div>
        <button className="icon-btn" onClick={() => setEditing(true)} aria-label="Editar ejercicio">✎</button>
      </header>
      {ex.cue && <div className="cue card"><span className="cue-label">Foco</span> {ex.cue}</div>}

      {ex.type !== 'core' && (
        <>
          <SuggestionBox s={suggest(ex, list)} />
          <div className="stats">
            <div><b>{best ? fmtNum(Math.round(best * 10) / 10) : '–'}</b><span>mejor 1RM est.</span></div>
            <div><b>{ex.repMin}–{ex.repMax}</b><span>rango repes</span></div>
            <div><b>+{fmtNum(ex.increment)}</b><span>kg por salto</span></div>
          </div>
          {variants.length > 1 ? (
            variants.map((v) => (
              <div key={v} className="card">
                <div className="card-title"><span>{v || 'Estándar'}</span></div>
                <ProgressChart entries={list.filter((e) => (e.variant ?? '') === v)} />
              </div>
            ))
          ) : (
            <div className="card"><ProgressChart entries={list} /></div>
          )}
        </>
      )}

      <div className="row gap">
        <button className="btn primary grow" onClick={() => navigate(`/log/${ex.id}`)}>Registrar hoy</button>
        <button className="btn" onClick={copyText}>Copiar texto</button>
      </div>

      <section className="card">
        <div className="card-title"><span>Historial completo</span></div>
        {[...list].reverse().map((e) => (
          <EntryView
            key={e.id}
            e={e}
            ex={ex}
            idx={list.indexOf(e) + 1}
            actions={
              <>
                <button className="mini" onClick={() => navigate(`/log/${ex.id}/${e.id}`)} aria-label="Editar">✎</button>
                <button className="mini" onClick={() => confirm('¿Borrar este registro?') && deleteEntry(e.id)} aria-label="Borrar">✕</button>
              </>
            }
          />
        ))}
      </section>
      {editing && (
        <ExerciseForm
          ex={ex}
          onCancel={() => setEditing(false)}
          onSave={(n) => {
            update((s) => ({ ...s, exercises: s.exercises.map((e) => (e.id === n.id ? n : e)) }));
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}
