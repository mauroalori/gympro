import { useEffect, useMemo, useRef, useState } from 'react';
import type { Store } from '../store';
import { activeRoutine, todayISO, uid } from '../store';
import type { Entry, SetEntry } from '../types';
import { entriesFor, hintsFor, lastValid, suggest, topSet } from '../progression';
import { formatEntry, parseLine } from '../parser';
import { EntryView, RestTimer, SetChips, Stepper, SuggestionBox, TypeBadge, entryLabel } from '../components';
import { navigate } from '../App';
import { askGemini, buildPrompt, loadAI, type AIAdvice } from '../ai';

export default function Log({ store, exId, entryId, dayId }: { store: Store; exId: string; entryId?: string; dayId?: string }) {
  const { state, upsertEntry, deleteEntry } = store;
  const ex = state.exercises.find((e) => e.id === exId);
  const today = todayISO();
  const list = useMemo(() => entriesFor(state.entries, exId), [state.entries, exId]);

  const [draft, setDraft] = useState<Entry>(() => {
    const existing = entryId ? list.find((e) => e.id === entryId) : [...list].reverse().find((e) => e.date === today);
    if (existing) return existing;
    const lastAny = [...list].reverse().find((e) => topSet(e.sets));
    const routine = activeRoutine(state);
    // asociar el registro al día de la rutina (el elegido, o el primero que contenga el ejercicio)
    const day = routine?.days.find((d) => d.id === dayId && d.exerciseIds.includes(exId)) ?? routine?.days.find((d) => d.exerciseIds.includes(exId));
    return { id: uid(), exerciseId: exId, date: today, seq: Date.now(), sets: [], variant: lastAny?.variant, routineId: routine?.id, dayId: day?.id };
  });
  const saved = useRef(list.some((e) => e.id === draft.id));
  const [showText, setShowText] = useState(false);
  const [text, setText] = useState('');
  const [noteOpen, setNoteOpen] = useState<number | null>(null);

  // autoguardado: cada cambio queda registrado
  useEffect(() => {
    const hasData = draft.sets.length > 0 || !!draft.note?.trim() || !!draft.raw?.trim() || !!draft.nextNote?.trim();
    if (hasData) {
      upsertEntry(draft);
      saved.current = true;
    } else if (saved.current) {
      deleteEntry(draft.id);
      saved.current = false;
    }
  }, [draft, upsertEntry, deleteEntry]);

  if (!ex) return <div className="page"><p className="empty">Ejercicio no encontrado.</p></div>;

  const isCore = ex.type === 'core';
  const s = suggest(ex, list, draft.id);
  const prevEntry = lastValid(list, { variant: draft.variant ?? null, excludeId: draft.id }) ?? lastValid(list, { excludeId: draft.id });
  const history = list.filter((e) => e.id !== draft.id).slice(-2).reverse();
  const hints = hintsFor(list, draft.id);
  const isSaved = list.some((e) => e.id === draft.id);
  const prevTop = prevEntry ? topSet(prevEntry.sets) : undefined;

  const setSets = (sets: SetEntry[]) => setDraft((d) => ({ ...d, sets }));
  const patchSet = (i: number, p: Partial<SetEntry>) => setSets(draft.sets.map((x, j) => (j === i ? { ...x, ...p } : x)));

  const addSet = () => {
    const i = draft.sets.length;
    const prev = draft.sets[i - 1];
    const ref = prevEntry?.sets[i];
    let weight = ref?.weight ?? prev?.weight ?? s.weight;
    let reps = ref?.reps ?? prev?.reps ?? s.reps ?? ex.repMin;
    // si toca subir, la serie que antes era la tope arranca con el peso nuevo
    if (s.kind === 'subir' && s.weight !== undefined && ref && prevTop && ref.weight === prevTop.weight) {
      weight = s.weight;
      reps = s.reps ?? reps;
    }
    if (s.kind === 'mantener' && ref && prevTop && ref === prevTop && s.reps) reps = s.reps;
    setSets([...draft.sets, { weight, reps }]);
  };

  const applyText = () => {
    const p = parseLine(text);
    setDraft((d) => ({ ...d, sets: p.sets, note: p.note, variant: p.variant ?? d.variant, raw: text }));
    setShowText(false);
  };

  const remove = () => {
    if (!confirm('¿Borrar este registro?')) return;
    deleteEntry(draft.id);
    saved.current = false;
    navigate('/');
  };

  return (
    <div className="page log">
      <header className="page-head row">
        <button className="back" onClick={() => (window.history.length > 1 ? window.history.back() : navigate('/'))} aria-label="Volver">‹</button>
        <div className="grow">
          <h1 className="h-ex">{ex.name}</h1>
          <div className="sub">
            <TypeBadge ex={ex} /> {draft.date === today ? 'Hoy' : draft.date ?? 'Histórico'}
            {isSaved && <span className="saved"> · guardado ✓</span>}
          </div>
        </div>
        <a className="icon-btn" href={`#/ex/${ex.id}`} aria-label="Ver progreso">📈</a>
      </header>

      <section className="card today-plan">
        <div className="card-title"><span>Para hoy</span></div>
        {!isCore && <SuggestionBox s={s} />}
        {ex.cue && (
          <div className="cue">
            <span className="cue-label">Foco</span> {ex.cue}
          </div>
        )}
        <AIPanel
          getPrompt={() => buildPrompt(state, ex, list, list.find((e) => e.id === draft.id), s)}
        />
        {hints.length > 0 && (
          <ul className="hints">
            {hints.map((h, i) => (
              <li key={i} className={h.explicit ? 'explicit' : ''}>
                <span className="muted small">{h.explicit ? 'Para la próxima' : 'Nota'} · {entryLabel(h.from, list.indexOf(h.from) + 1)}</span>
                {h.text}
              </li>
            ))}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <details className="card" open>
          <summary>Últimas {history.length === 1 ? 'vez' : '2 veces'}</summary>
          {history.map((e) => (
            <EntryView key={e.id} e={e} ex={ex} idx={list.indexOf(e) + 1} />
          ))}
          <a className="link-btn small-link" href={`#/ex/${ex.id}`}>Ver historial completo</a>
        </details>
      )}

      {isCore ? (
        <section className="card">
          <label className="field">
            <span>Registro (ej: 60seg x3, x10 cada lado x3)</span>
            <input
              value={draft.raw ?? ''}
              placeholder={history[0]?.raw ?? '45seg x3'}
              onChange={(e) => setDraft((d) => ({ ...d, raw: e.target.value }))}
            />
          </label>
        </section>
      ) : (
        <section className="card sets">
          <div className="card-title">
            <span>Series</span>
            <label className="variant-input">
              <span>Variante</span>
              <input value={draft.variant ?? ''} placeholder="—" onChange={(e) => setDraft((d) => ({ ...d, variant: e.target.value || undefined }))} />
            </label>
          </div>
          {draft.sets.map((st, i) => (
            <div className={`set-row${st.mvc ? ' is-mvc' : ''}`} key={i}>
              <div className="set-top">
                <span className="set-num">{i + 1}</span>
                <span className="set-ref">
                  {prevEntry?.sets[i] ? `antes ${prevEntry.sets[i].weight ?? ''}x${prevEntry.sets[i].reps ?? ''}` : ''}
                </span>
                <button type="button" className={`toggle${st.mvc ? ' on' : ''}`} onClick={() => patchSet(i, { mvc: !st.mvc })}>
                  MVC
                </button>
                <button type="button" className={`mini${st.note ? ' has' : ''}`} onClick={() => setNoteOpen(noteOpen === i ? null : i)} aria-label="Nota">✎</button>
                <button type="button" className="mini" onClick={() => setSets(draft.sets.filter((_, j) => j !== i))} aria-label="Borrar serie">✕</button>
              </div>
              <div className="set-inputs">
                <Stepper value={st.weight} onChange={(v) => patchSet(i, { weight: v })} step={ex.increment || 1} unit="kg" decimal />
                <Stepper value={st.reps} onChange={(v) => patchSet(i, { reps: v === undefined ? undefined : Math.round(v) })} step={1} unit="rep" />
              </div>
              {(noteOpen === i || st.note) && (
                <input className="set-note" placeholder="Nota de la serie…" value={st.note ?? ''} onChange={(e) => patchSet(i, { note: e.target.value || undefined })} />
              )}
            </div>
          ))}
          <div className="row gap">
            <button className="btn primary grow" onClick={addSet}>+ Serie</button>
            <button
              className="btn"
              onClick={() => {
                setText(draft.sets.length ? formatEntry(draft) : '');
                setShowText((v) => !v);
              }}
            >
              Aa Texto
            </button>
          </div>
          {showText && (
            <div className="text-mode">
              <textarea
                rows={3}
                value={text}
                placeholder="50x10 MVC segunda 50x9 mitad 50x7 (nota) ultima 50x6 MVC"
                onChange={(e) => setText(e.target.value)}
                autoFocus
              />
              {text.trim() && (
                <div className="preview">
                  Se entiende: <SetChips sets={parseLine(text).sets} highlightTop={false} />
                  {parseLine(text).note && <div className="muted">Nota: {parseLine(text).note}</div>}
                </div>
              )}
              <button className="btn primary" onClick={applyText} disabled={!text.trim()}>Usar este texto</button>
            </div>
          )}
        </section>
      )}

      <section className="card">
        <label className="field">
          <span>Notas finales (cómo se sintió, técnica, molestias)</span>
          <textarea rows={2} value={draft.note ?? ''} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value || undefined }))} />
        </label>
        <label className="field">
          <span>📌 Para la próxima vez</span>
          <textarea
            rows={2}
            placeholder="Ej: arrancar con 45, buscar 30x9 lento…"
            value={draft.nextNote ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, nextNote: e.target.value || undefined }))}
          />
        </label>
      </section>

      <div className="row gap">
        <button className="btn primary grow" onClick={() => navigate('/')}>Listo</button>
        {isSaved && <button className="btn danger" onClick={remove}>Borrar</button>}
      </div>

      <RestTimer />
    </div>
  );
}

function AIPanel({ getPrompt }: { getPrompt: () => string }) {
  const [busy, setBusy] = useState(false);
  const [advice, setAdvice] = useState<AIAdvice | null>(null);
  const [error, setError] = useState('');
  const cfg = loadAI();

  const ask = async () => {
    if (!cfg.apiKey) {
      navigate('/settings');
      return;
    }
    setBusy(true);
    setError('');
    try {
      setAdvice(await askGemini(cfg, getPrompt()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ai">
      {advice && (
        <div className={`sug ia ${advice.decision}`}>
          <span className="sug-icon">✨</span>
          <div>
            <div className="sug-title">{advice.objetivo}</div>
            <div className="sug-detail">{advice.razon}</div>
            {advice.alerta && <div className="ai-alert">⚠ {advice.alerta}</div>}
          </div>
        </div>
      )}
      {error && <div className="ai-error">{error}</div>}
      <button className="btn ai-btn" onClick={ask} disabled={busy}>
        {busy ? 'Pensando…' : !cfg.apiKey ? '✨ Activar Consejo IA (gratis)' : advice ? '✨ Preguntar de nuevo' : '✨ Consejo IA'}
      </button>
    </div>
  );
}
