import { describe, expect, it } from 'vitest';
import { formatEntry, parseLine } from './parser';
import { hintsFor, suggest, topSet } from './progression';
import { buildSeed } from './seed';

describe('parseLine', () => {
  it('parsea series con etiquetas, MVC y notas', () => {
    const p = parseLine('50x10 MVC segunda 50x9 MVC (nota uno) mitad 50x7 ultima 44x10 MVC (mucho mejor)');
    expect(p.sets).toEqual([
      { weight: 50, reps: 10, mvc: true },
      { weight: 50, reps: 9, mvc: true, label: 'segunda', note: 'nota uno' },
      { weight: 50, reps: 7, label: 'mitad' },
      { weight: 44, reps: 10, mvc: true, label: 'ultima', note: 'mucho mejor' },
    ]);
  });
  it('decimales con coma y kg', () => {
    expect(parseLine('37,5x10 mitad 8Kgx15').sets.map((s) => s.weight)).toEqual([37.5, 8]);
  });
  it('variantes y peso corporal', () => {
    const p = parseLine('dominadas -> x7 MVC segunda x5 MVC ultima x4 MVC');
    expect(p.variant).toBe('dominadas');
    expect(p.sets.map((s) => s.reps)).toEqual([7, 5, 4]);
    expect(p.sets[0].weight).toBeUndefined();
  });
  it('drop set', () => {
    const p = parseLine('15x10 segunda 20x10 ultima 25x3-20x6 MVC');
    expect(p.sets[3]).toEqual({ weight: 20, reps: 6, mvc: true, label: 'drop' });
  });
  it('texto suelto va a la nota', () => {
    const p = parseLine('10x12 segunda 10x10 mitad 10x8 (dolor de muñeca) no hago la última, está de mas');
    expect(p.sets).toHaveLength(3);
    expect(p.note).toContain('no hago la última');
    expect(parseLine('prueba técnica').note).toBe('prueba técnica');
  });
  it('frase larga antes de -> no es variante', () => {
    const p = parseLine('cambio a barra olímpica 15 -> 20. 20x10 segunda 30x8');
    expect(p.variant).toBeUndefined();
    expect(p.sets.map((s) => s.weight)).toEqual([20, 30]);
  });
  it('ida y vuelta texto -> registro -> texto', () => {
    const line = '50x10 MVC segunda 50x9 MVC mitad 50x7 MVC ultima 50x7 MVC';
    expect(formatEntry(parseLine(line))).toBe(line);
  });
});

describe('progresión sobre el historial', () => {
  const s = buildSeed();
  const sug = (id: string) => {
    const ex = s.exercises.find((e) => e.id === id)!;
    return suggest(ex, s.entries.filter((e) => e.exerciseId === id));
  };
  it('todas las líneas de ejercicios con peso tienen series (salvo notas)', () => {
    const empty = s.entries.filter((e) => {
      const ex = s.exercises.find((x) => x.id === e.exerciseId)!;
      return ex.type !== 'core' && !topSet(e.sets);
    });
    expect(empty.map((e) => e.raw)).toEqual(['prueba técnica']);
  });
  it('vuelo lateral 4x15 -> subir peso', () => {
    expect(sug('vuelo-lateral')).toMatchObject({ kind: 'subir', weight: 5, reps: 6 });
  });
  it('press militar 10x14 -> subir a 12x8', () => {
    expect(sug('press-militar-con-mancuernas')).toMatchObject({ kind: 'subir', weight: 12, reps: 8 });
  });
  it('banco plano 50x10 -> mantener y buscar 11', () => {
    expect(sug('banco-plano')).toMatchObject({ kind: 'mantener', weight: 50, reps: 11 });
  });
  it('prensa 120x11 -> 120x12', () => {
    expect(sug('prensa')).toMatchObject({ kind: 'mantener', weight: 120, reps: 12 });
  });
  it('dorsales usa la última variante con peso', () => {
    expect(sug('dorsales')).toMatchObject({ kind: 'subir', weight: 45, reps: 8 });
  });
  it('dorsales usa la última variante con peso', () => {
    expect(sug('dorsales')).toMatchObject({ kind: 'subir', weight: 45, reps: 8 });
  });
  it('dominadas es un ejercicio aparte (peso corporal)', () => {
    const dom = s.entries.filter((e) => e.exerciseId === 'dominadas');
    expect(dom).toHaveLength(7);
    expect(dom.every((e) => !e.variant)).toBe(true);
    expect(sug('dominadas')).toMatchObject({ kind: 'mantener', reps: 7 });
  });
});

describe('rutinas y notas', () => {
  const s = buildSeed();
  it('rutina noviembre activa con los días de la planilla', () => {
    const r = s.routines.find((x) => x.id === s.activeRoutineId)!;
    expect(r.name).toBe('Rutina noviembre');
    expect(r.days.map((d) => d.name)).toEqual(['Espalda y Tríceps', 'Pecho y Bíceps', 'Core', 'Piernas', 'Hombros y Brazos']);
    const ids = new Set(s.exercises.map((e) => e.id));
    for (const d of r.days) for (const id of d.exerciseIds) expect(ids.has(id)).toBe(true);
    expect(s.exercises.find((e) => e.id === 'prensa')!.cue).toMatch(/lumbar/);
  });
  it('recordatorios de las 2 últimas sesiones', () => {
    const h = hintsFor(s.entries.filter((e) => e.exerciseId === 'pull-over').sort((a, b) => a.seq - b.seq));
    expect(h.map((x) => x.text)).toContain('por tríceps, buscar 30x9 lento');
  });
});

describe('al fallo', () => {
  it('"al fallo" cuenta como MVC', () => {
    expect(parseLine('ultima 105x14 al fallo').sets[0].mvc).toBe(true);
  });
});
