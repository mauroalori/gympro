export type ExerciseType = 'compuesto' | 'aislamiento' | 'core';

/** ejercicio de la biblioteca: su historial se conserva entre rutinas */
export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  repMin: number;
  repMax: number;
  /** salto de peso al progresar (kg) */
  increment: number;
  /** foco técnico fijo ("Foco / notas") */
  cue?: string;
}

export interface RoutineDay {
  id: string;
  name: string;
  exerciseIds: string[];
}

export interface Routine {
  id: string;
  name: string;
  /** el orden de los días es la rotación */
  days: RoutineDay[];
}

export interface Habit {
  id: string;
  name: string;
  kind: string;
  dose?: string;
  how?: string;
}

export interface DailyLog {
  /** dolor lumbar 0–10 */
  pain?: number;
  habits?: string[];
}

export interface SetEntry {
  /** etiqueta original ("segunda", "mitad", "ultima", "drop") — opcional */
  label?: string;
  /** kg; undefined = peso corporal */
  weight?: number;
  reps?: number;
  /** llegó al fallo (Máxima Contracción Voluntaria) */
  mvc?: boolean;
  note?: string;
}

export interface Entry {
  id: string;
  exerciseId: string;
  /** YYYY-MM-DD; undefined en registros importados sin fecha */
  date?: string;
  /** orden cronológico (timestamp o secuencia para importados) */
  seq: number;
  routineId?: string;
  dayId?: string;
  /** variante del ejercicio: "30°", "Banco Scott"... */
  variant?: string;
  sets: SetEntry[];
  /** notas finales del ejercicio */
  note?: string;
  /** recordatorio para la próxima vez */
  nextNote?: string;
  /** texto original (registros importados o escritos como texto) */
  raw?: string;
  imported?: boolean;
}

export interface AppState {
  version: 2;
  exercises: Exercise[];
  routines: Routine[];
  activeRoutineId: string;
  entries: Entry[];
  habits: Habit[];
  daily: Record<string, DailyLog>;
  restSeconds: number;
}
