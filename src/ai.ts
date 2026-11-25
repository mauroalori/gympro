import type { AppState, Entry, Exercise } from './types';
import { formatEntry } from './parser';
import type { Suggestion } from './progression';

/** configuración de la IA: vive solo en este teléfono, fuera del backup */
export interface AIConfig {
  apiKey: string;
  model: string;
}

const KEY = 'gympro:ai';
export const DEFAULT_MODEL = 'gemini-flash-latest';

export function loadAI(): AIConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { apiKey: '', model: DEFAULT_MODEL, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { apiKey: '', model: DEFAULT_MODEL };
}

export function saveAI(c: AIConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

export interface AIAdvice {
  decision: 'subir' | 'mantener' | 'bajar';
  objetivo: string;
  razon: string;
  alerta?: string;
}

const SYSTEM = `Sos un entrenador de fuerza que ayuda a decidir la carga de HOY para UN ejercicio, en español rioplatense, breve y concreto.
Método del usuario (doble progresión):
- Aislamiento: rango 6–15 repes. Compuesto: rango 8–12. Los rangos de cada ejercicio vienen en los datos.
- Mantiene el peso y suma repes semana a semana. Sube el peso recién cuando al menos 2 series con el peso más alto llegan al tope del rango; al subir vuelve al mínimo del rango.
- Notación: "50x10" = 50 kg × 10 repes; "x7" = peso corporal; "MVC" = serie llevada al fallo; "segunda/mitad/ultima" = orden de las series; texto entre paréntesis = notas.
- Las notas del usuario (técnica, dolor, "mantener", "para la próxima") tienen prioridad sobre la regla.
- Dolor lumbar 0–10: hasta 3 y que baje en 24 h, seguir; si es mayor o sube, bajar la carga o priorizar técnica.
- Ante dolor articular o técnica comprometida, preferí mantener o bajar antes que subir.
Respondé SOLO el JSON pedido. "objetivo": la carga para hoy (ej: "50 kg × 11 en la primera, sostener ≥8 en el resto"). "razon": 1–2 frases citando el dato que justifica. "alerta": solo si hay algo de dolor/técnica a cuidar, si no omitila.`;

function entryText(e: Entry): string {
  const body = e.sets.length ? formatEntry(e) : (e.raw ?? e.note ?? '');
  return `${e.date ?? 'sin fecha'}: ${body}${e.nextNote ? ` [para la próxima: ${e.nextNote}]` : ''}`;
}

export function buildPrompt(state: AppState, ex: Exercise, list: Entry[], current: Entry | undefined, rule: Suggestion): string {
  const past = list.filter((e) => e.id !== current?.id).slice(-4);
  const pains = Object.entries(state.daily)
    .filter(([, d]) => d.pain !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-5)
    .map(([d, v]) => `${d}: ${v.pain}`);
  const lines = [
    `Ejercicio: ${ex.name} (${ex.type}${ex.type !== 'core' ? `, rango ${ex.repMin}–${ex.repMax} repes, salto de peso ${ex.increment} kg` : ', registro libre de tiempo/repes'})`,
    ex.cue ? `Foco técnico: ${ex.cue}` : '',
    `Sesiones anteriores (de más vieja a más nueva):\n${past.length ? past.map((e) => `- ${entryText(e)}`).join('\n') : '- ninguna, es la primera vez'}`,
    current && (current.sets.length || current.raw) ? `Hoy ya hizo: ${entryText(current)}` : '',
    pains.length ? `Dolor lumbar reciente (fecha: 0–10): ${pains.join(', ')}` : '',
    `Sugerencia de la regla automática: ${rule.title} (${rule.detail})`,
    '¿Qué carga le recomendás para hoy?',
  ];
  return lines.filter(Boolean).join('\n\n');
}

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    decision: { type: 'STRING', enum: ['subir', 'mantener', 'bajar'] },
    objetivo: { type: 'STRING' },
    razon: { type: 'STRING' },
    alerta: { type: 'STRING' },
  },
  required: ['decision', 'objetivo', 'razon'],
};

export function parseAdvice(data: unknown): AIAdvice {
  const d = data as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = d.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  const a = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '')) as AIAdvice;
  if (!a.objetivo || !a.razon) throw new Error('Respuesta incompleta de la IA');
  if (!['subir', 'mantener', 'bajar'].includes(a.decision)) a.decision = 'mantener';
  if (!a.alerta?.trim()) delete a.alerta;
  return a;
}

export async function askGemini(cfg: AIConfig, prompt: string): Promise<AIAdvice> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model || DEFAULT_MODEL)}:generateContent`,
      {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey.trim() },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, responseMimeType: 'application/json', responseSchema: SCHEMA },
        }),
      }
    );
    if (!res.ok) {
      if (res.status === 429) throw new Error('Llegaste al límite gratis de consultas. Probá en un rato.');
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        const body = await res.text();
        if (/API key|API_KEY|permission/i.test(body)) throw new Error('La clave de Gemini no es válida. Revisala en Ajustes.');
        if (/model/i.test(body)) throw new Error('El modelo configurado no existe. Revisalo en Ajustes.');
      }
      if (res.status === 404) throw new Error('El modelo configurado no existe. Revisalo en Ajustes.');
      throw new Error(`Error de la IA (${res.status}). Probá de nuevo.`);
    }
    return parseAdvice(await res.json());
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('La IA tardó demasiado. Probá de nuevo.');
    if (e instanceof TypeError) throw new Error('Sin conexión con la IA. Revisá internet.');
    throw e;
  } finally {
    clearTimeout(t);
  }
}
