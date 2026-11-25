import { describe, expect, it } from 'vitest';
import { buildPrompt, parseAdvice } from './ai';
import { buildSeed } from './seed';
import { suggest } from './progression';

describe('consejo IA', () => {
  const s = buildSeed();
  const ex = s.exercises.find((e) => e.id === 'triceps-en-polea-con-barra')!;
  const list = s.entries.filter((e) => e.exerciseId === ex.id).sort((a, b) => a.seq - b.seq);
  it('el prompt incluye rango, foco, últimas sesiones y la regla', () => {
    const p = buildPrompt({ ...s, daily: { '2026-11-24': { pain: 2 } } }, ex, list, undefined, suggest(ex, list));
    expect(p).toContain('rango 6–15');
    expect(p).toContain('pulgar arriba');
    expect(p).toContain('30x12 segunda 30x15 mitad 30x14 MVC ultima 30x13 MVC');
    expect(p).toContain('2026-11-24: 2');
    expect(p).toContain('30 kg × 15');
  });
  it('parsea la respuesta de Gemini', () => {
    const a = parseAdvice({
      candidates: [{ content: { parts: [{ text: '{"decision":"mantener","objetivo":"30 kg × 15","razon":"Solo una serie llegó a 15.","alerta":""}' }] } }],
    });
    expect(a).toEqual({ decision: 'mantener', objetivo: '30 kg × 15', razon: 'Solo una serie llegó a 15.' });
  });
});
