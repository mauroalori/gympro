import { useEffect, useRef, useState } from 'react';
import type { Entry, Exercise, SetEntry } from './types';
import { fmtNum, fmtSet } from './parser';
import type { Suggestion } from './progression';
import { e1rm, topSet } from './progression';
import { fmtDate } from './store';

export function SetChips({ sets, highlightTop = true }: { sets: SetEntry[]; highlightTop?: boolean }) {
  const top = highlightTop ? topSet(sets) : undefined;
  return (
    <span className="chips">
      {sets.map((s, i) => (
        <span key={i} className={`chip${s.mvc ? ' mvc' : ''}${s === top ? ' top' : ''}${s.label === 'drop' ? ' drop' : ''}`}>
          {fmtSet(s).replace(' MVC', '')}
        </span>
      ))}
    </span>
  );
}

export function TypeBadge({ ex }: { ex: Exercise }) {
  if (ex.type === 'core') return <span className="badge core">core</span>;
  return (
    <span className={`badge ${ex.type}`}>
      {ex.type === 'compuesto' ? 'comp.' : 'aisl.'} {ex.repMin}–{ex.repMax}
    </span>
  );
}

export function SuggestionBox({ s, compact }: { s: Suggestion; compact?: boolean }) {
  const icon = s.kind === 'subir' ? '↑' : s.kind === 'bajar' ? '↓' : s.kind === 'mantener' ? '→' : '•';
  return (
    <div className={`sug ${s.kind}${compact ? ' compact' : ''}`}>
      <span className="sug-icon">{icon}</span>
      <div>
        <div className="sug-title">{s.title}</div>
        {!compact && <div className="sug-detail">{s.detail}</div>}
      </div>
    </div>
  );
}

export function entryLabel(e: Entry, idx?: number) {
  if (e.date) return fmtDate(e.date);
  return `Histórico #${idx ?? e.seq}`;
}

export function EntryView({ e, ex, idx, actions }: { e: Entry; ex: Exercise; idx?: number; actions?: React.ReactNode }) {
  const isCore = ex.type === 'core';
  const setNotes = e.sets.filter((s) => s.note);
  return (
    <div className="entry">
      <div className="entry-head">
        <span className="entry-date">{entryLabel(e, idx)}</span>
        {e.variant && <span className="badge variant">{e.variant}</span>}
        <span className="spacer" />
        {actions}
      </div>
      {isCore || !e.sets.length ? (
        <div className="entry-raw">{e.raw || e.note || '—'}</div>
      ) : (
        <>
          <SetChips sets={e.sets} />
          {(e.note || setNotes.length > 0) && (
            <ul className="notes">
              {setNotes.map((s, i) => (
                <li key={i}>
                  <b>{fmtSet(s).replace(' MVC', '')}</b> {s.note}
                </li>
              ))}
              {e.note && <li>{e.note}</li>}
            </ul>
          )}
        </>
      )}
      {isCore && e.note && e.raw && <ul className="notes"><li>{e.note}</li></ul>}
      {e.nextNote && <div className="hint-line explicit">📌 {e.nextNote}</div>}
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  step,
  unit,
  decimal,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  step: number;
  unit: string;
  decimal?: boolean;
}) {
  const [text, setText] = useState(value === undefined ? '' : fmtNum(value));
  useEffect(() => {
    setText((t) => {
      const parsed = parseFloat(t.replace(',', '.'));
      return parsed === value ? t : value === undefined ? '' : fmtNum(value);
    });
  }, [value]);
  const bump = (d: number) => onChange(Math.max(0, Math.round(((value ?? 0) + d) * 100) / 100));
  return (
    <div className="stepper">
      <button type="button" onClick={() => bump(-step)} aria-label="menos">−</button>
      <label>
        <input
          inputMode={decimal ? 'decimal' : 'numeric'}
          value={text}
          placeholder="–"
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            setText(e.target.value);
            const v = parseFloat(e.target.value.replace(',', '.'));
            onChange(Number.isFinite(v) ? v : undefined);
          }}
        />
        <span>{unit}</span>
      </label>
      <button type="button" onClick={() => bump(step)} aria-label="más">+</button>
    </div>
  );
}

/** gráfico de 1RM estimado y peso tope por sesión */
export function ProgressChart({ entries }: { entries: Entry[] }) {
  const pts = entries
    .map((e) => ({ e1: e1rm(e.sets), top: topSet(e.sets)?.weight }))
    .filter((p) => p.e1 !== undefined) as { e1: number; top: number }[];
  if (pts.length < 2) return <div className="chart-empty">Necesitás al menos 2 sesiones con peso para ver el gráfico.</div>;
  const W = 340, H = 150, P = { l: 34, r: 10, t: 12, b: 20 };
  const vals = pts.flatMap((p) => [p.e1, p.top]);
  let min = Math.min(...vals), max = Math.max(...vals);
  const pad = (max - min) * 0.1 || 5;
  min = Math.max(0, min - pad);
  max += pad;
  const x = (i: number) => P.l + (i / (pts.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b);
  const line = (k: 'e1' | 'top') => pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(' ');
  const ticks = [min, (min + max) / 2, max];
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Progreso del 1RM estimado">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={P.l - 6} y={y(t) + 3} textAnchor="end" className="axis">{Math.round(t)}</text>
          </g>
        ))}
        <path d={line('top')} className="line-top" />
        <path d={line('e1')} className="line-e1" />
        {pts.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.e1)} r={i === pts.length - 1 ? 4 : 2.5} className="dot-e1" />
        ))}
        <text x={P.l} y={H - 4} className="axis">1ª</text>
        <text x={W - P.r} y={H - 4} textAnchor="end" className="axis">última ({pts.length})</text>
      </svg>
      <figcaption>
        <span className="key e1" /> 1RM estimado <span className="key top" /> peso tope
      </figcaption>
    </figure>
  );
}

const REST_SECONDS = 90;

/** timer de descanso fijo de 90 s (no se registra en ningún lado) */
export function RestTimer() {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const fired = useRef(false);
  useEffect(() => {
    if (!endAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endAt]);
  const left = endAt ? Math.max(0, Math.ceil((endAt - now) / 1000)) : 0;
  useEffect(() => {
    if (endAt && left === 0 && !fired.current) {
      fired.current = true;
      navigator.vibrate?.([300, 150, 300]);
      try {
        const ctx = new AudioContext();
        const o = ctx.createOscillator();
        o.frequency.value = 880;
        o.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.4);
      } catch {
        /* ignore */
      }
    }
  }, [left, endAt]);
  const start = () => {
    fired.current = false;
    setNow(Date.now());
    setEndAt(Date.now() + REST_SECONDS * 1000);
  };
  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return (
    <div className={`timer${endAt ? (left === 0 ? ' done' : ' running') : ''}`}>
      {endAt ? (
        <>
          <span className="timer-time">{left === 0 ? '¡Dale!' : mm}</span>
          <button type="button" onClick={start}>Reiniciar</button>
          <button type="button" onClick={() => setEndAt(null)} aria-label="Cerrar timer">✕</button>
        </>
      ) : (
        <button type="button" className="timer-start" onClick={start}>⏱ Descanso 90s</button>
      )}
    </div>
  );
}
