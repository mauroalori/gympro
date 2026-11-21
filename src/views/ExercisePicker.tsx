import { useState } from 'react';
import type { AppState, Exercise, ExerciseType } from '../types';
import { RANGES } from '../seed';
import { uid } from '../store';

/** buscar en la biblioteca o crear un ejercicio nuevo (sin pesos ni repes prefijadas) */
export default function ExercisePicker({
  state,
  exclude,
  onPick,
  onCancel,
}: {
  state: AppState;
  exclude: string[];
  onPick: (ex: Exercise, isNew: boolean) => void;
  onCancel: () => void;
}) {
  const [q, setQ] = useState('');
  const [type, setType] = useState<ExerciseType>('aislamiento');
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const matches = state.exercises.filter((e) => !exclude.includes(e.id) && norm(e.name).includes(norm(q.trim())));
  const count = (id: string) => state.entries.filter((e) => e.exerciseId === id).length;
  const exact = state.exercises.some((e) => norm(e.name) === norm(q.trim()));

  const create = () => {
    const [repMin, repMax] = RANGES[type];
    onPick({ id: uid(), name: q.trim(), type, repMin, repMax, increment: type === 'compuesto' ? 5 : type === 'core' ? 0 : 2.5 }, true);
  };

  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Agregar ejercicio</h2>
        <input placeholder="Buscar o escribir uno nuevo…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        {q.trim() && !exact && (
          <div className="new-ex">
            <div className="seg">
              {(['compuesto', 'aislamiento', 'core'] as ExerciseType[]).map((t) => (
                <button type="button" key={t} className={type === t ? 'on' : ''} onClick={() => setType(t)}>{t}</button>
              ))}
            </div>
            <button className="btn primary" onClick={create}>
              Crear “{q.trim()}”
            </button>
            <p className="muted small">
              {type === 'core' ? 'Registro libre (segundos, repes, vueltas).' : `Rango ${RANGES[type][0]}–${RANGES[type][1]} repes. El peso lo definís la primera vez que lo hacés.`}
            </p>
          </div>
        )}
        <div className="pick-list">
          {matches.map((ex) => (
            <button key={ex.id} className="pick-row" onClick={() => onPick(ex, false)}>
              <span className="grow">{ex.name}</span>
              <span className="muted small">{count(ex.id) ? `${count(ex.id)} reg.` : 'nuevo'}</span>
            </button>
          ))}
          {!matches.length && !q.trim() && <p className="muted small">No hay más ejercicios en la biblioteca. Escribí uno nuevo.</p>}
        </div>
        <button className="btn" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}
