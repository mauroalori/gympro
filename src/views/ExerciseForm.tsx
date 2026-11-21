import { useState } from 'react';
import type { Exercise, ExerciseType } from '../types';
import { RANGES } from '../seed';

export default function ExerciseForm({
  ex,
  onSave,
  onCancel,
  onDelete,
}: {
  ex: Exercise;
  onSave: (e: Exercise) => void;
  onCancel: () => void;
  onDelete?: (e: Exercise) => void;
}) {
  const [f, setF] = useState(ex);
  const setType = (type: ExerciseType) => {
    const [repMin, repMax] = RANGES[type];
    setF({ ...f, type, repMin, repMax });
  };
  return (
    <div className="modal-bg" onClick={onCancel}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (f.name.trim()) onSave({ ...f, name: f.name.trim(), cue: f.cue?.trim() || undefined });
        }}
      >
        <h2>Editar ejercicio</h2>
        <label className="field">
          <span>Nombre</span>
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        </label>
        <div className="seg">
          {(['compuesto', 'aislamiento', 'core'] as ExerciseType[]).map((t) => (
            <button type="button" key={t} className={f.type === t ? 'on' : ''} onClick={() => setType(t)}>{t}</button>
          ))}
        </div>
        {f.type !== 'core' && (
          <div className="row gap">
            <label className="field grow">
              <span>Repes mín.</span>
              <input inputMode="numeric" value={f.repMin} onChange={(e) => setF({ ...f, repMin: Number(e.target.value) || 0 })} />
            </label>
            <label className="field grow">
              <span>Repes máx.</span>
              <input inputMode="numeric" value={f.repMax} onChange={(e) => setF({ ...f, repMax: Number(e.target.value) || 0 })} />
            </label>
            <label className="field grow">
              <span>Salto kg</span>
              <input inputMode="decimal" value={String(f.increment).replace('.', ',')} onChange={(e) => setF({ ...f, increment: parseFloat(e.target.value.replace(',', '.')) || 0 })} />
            </label>
          </div>
        )}
        <label className="field">
          <span>Foco / notas fijas (se muestran siempre)</span>
          <textarea rows={3} value={f.cue ?? ''} onChange={(e) => setF({ ...f, cue: e.target.value })} placeholder="Ej: codos pegados, sin balanceo…" />
        </label>
        <div className="row gap">
          <button type="submit" className="btn primary grow">Guardar</button>
          <button type="button" className="btn" onClick={onCancel}>Cancelar</button>
        </div>
        {onDelete && <button type="button" className="link-btn danger-text" onClick={() => onDelete(ex)}>Borrar ejercicio y su historial</button>}
      </form>
    </div>
  );
}
