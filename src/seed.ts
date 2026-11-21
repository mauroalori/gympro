import type { AppState, Entry, Exercise, ExerciseType, Habit, Routine } from './types';
import { parseLine } from './parser';

export const RANGES: Record<ExerciseType, [number, number]> = {
  aislamiento: [6, 15],
  compuesto: [8, 12],
  core: [0, 0],
};

const DAY_NAMES: Record<string, string> = {
  espalda: 'Espalda y Tríceps',
  pecho: 'Pecho y Bíceps',
  core: 'Core',
  piernas: 'Piernas',
  brazos: 'Hombros y Brazos',
};
const ROTATION = ['espalda', 'pecho', 'core', 'piernas', 'brazos'];

interface SeedExercise {
  name: string;
  day: string;
  type: ExerciseType;
  inc: number;
  history: string;
}

// Historial original, copiado de tus notas (una línea por sesión)
const SEED: SeedExercise[] = [
  // ───────── Piernas
  { name: 'Prensa', day: 'piernas', type: 'compuesto', inc: 5, history: `
-> 85x10 segunda 90x10 mitad 95x10 ultima 105x14 al fallo (aflojé la última porque puse mal la espalda, estás para mucho mas negrito)
-> 90x10 segunda 95x10 mitad 100x10 ultima 105x16 MVC
-> 95x10 ultima 100x14 MVC (mejoro mucho la técnica llevando rodillas mas al pecho y abriendo menos las rodillas, movimiento mas recto de las rodillas que requiere mayor flexibilidad de la cadera)
-> 95x10 ultima 100x12 MVC (no me acuerdo cuántas fueron las últimas, pero puedo subir un poco el peso manteniendo la técnica)
-> 100x10 mitad 100x11 MVC ultima 100x13 MVC (mejoro técnica separando apenas los pies y mejorando la coordinación de la respiración con el movimiento)
-> 105x10 segunda 105x12 mitad 110x12 ultima 115x
-> 110x12 mitad 110x12 última 110x14 MVC (puedo subir chill)
-> 110x12 segunda 110x12 (subo lento y me concentro y se pone intenso) mitad 110x12 (puedo subir peso manteniendo esta intensidad)
-> 110x10 segunda 110x12 mitad 120x8 ultima 120x11 MVC` },
  { name: 'RDL', day: 'piernas', type: 'compuesto', inc: 2.5, history: `
-> prueba técnica
-> prueba segunda 10x7 ultima 10x7 (dolor de lumbar)` },
  { name: 'Hip thrust (barra de hip thrust)', day: 'piernas', type: 'compuesto', inc: 5, history: `
-> aprendí la técnica 40x10 ultima 40x12 con barra de hip trust
-> 40x10 mitad 50x10 MVC (se sintió bien, también la lumbar)
-> 50x10 ultima 50x10 (se sintió mucho mas los glúteos pero tengo que mejorar la técnica porque esforcé mucho la lumbar)
-> 60x10 mitad 60x12 ultima 60x12 (mucho uso de la lumbar, tengo que bajar el peso la prox)
-> 50x12 va bien, seguir mejorando la técnica con este peso hasta no sentir la lumbar` },
  { name: 'Abductores', day: 'piernas', type: 'aislamiento', inc: 5, history: `
-> 65x10 segunda 70x10 ultima 75x11 MVC (arrancar de 70 la prox)
-> 70x10 mitad 75x10 ultima 75x12 MVC (aguanto 1 seg al final)
-> 70x10 mitad 75x10 ultima 75x11 MVC (aguanto 1 seg al final, costó cerrar del todo, tal vez me conviene quedar en 70 y llegar mas al final aguantando 1 seg)
-> 70x10 ultima 65x10 (mejorando la técnica con menor peso, pensar en la bici)
-> 65x10 mitad 70x10 ultima 70x11 MVC (tecnica aguantando 1seg al final, moretón en rodilla)
-> 60x12 segunda 65x12 mitad 65x11 MVC ultima 65x11 MVC
-> 60x15 mitad 65x8 ultima 65x11 MVC` },
  { name: 'Gemelos', day: 'piernas', type: 'aislamiento', inc: 5, history: `
-> 30x10 ultima 30x12
-> 30x10 segunda 40x10 ultima 50x14 MVC (empezar con 40 o 45 por lo menos)
-> 45x10 mitad 50x10 ultima 50x13 MVC (aguantando un par de segs al final, sino no es worth)
-> 45x10 segunda 50x10 ultima 50x14 MVC
-> 50x10 ultima 50x14 MVC (seguir con este peso y aguantar 1 seg arriba)
-> 50x14 mitad 50x12 MVC ultima 50x14 MVC (cambié un poco la posición del cuerpo y cambia mucho, vale la pena hacer EMG acá para ver cómo mejorar la técnica)
-> 40x15 mitad 40x15 ultima 40x15
-> 45x15 mitad 45x14 MVC ultima 45x15 MVC
-> 45x15` },
  { name: 'Isquios', day: 'piernas', type: 'aislamiento', inc: 5, history: `
-> 15x10 segunda 20x10 ultima 25x3-20x6 MVC (mantener 20, 25 es demasiado todavía, mejorar técnica)
-> estocadas caminando -> 8Kgx15
-> 20x10 mitad 20x10 MVC ultima 20x10 MVC (mejoro técnica un poco)
-> 20x10 ultima 20x11 MVC
-> 20x10 mitad 20x10 MVC ultima 20x10 MVC (mejoro un poco la técnica en la última, seguir con este peso)
-> 20x10 mitad 20x8 MVC (ya empiezo a meter gemelos superiores y freno) ultima 20x8 MVC (recaigo mucho en gemelos cuando fallo, es mas, creo que la técnica la hago mal porque me fallan primero los gemelos a pesar de que los isquios trabajan)
-> 15x14 MVC (durísimo arrancar con 20, además una molestia en la rodilla derecha, y moretones y cascaritas duelen y molestan) segunda 15x13 MVC (técnica mas lenta) mitad 15x12 MVC ultima 15x12 MVC
-> 15x15 (dolor en rodilla derecha, entrar en calor un poco mejor) segunda 10x15 (técnica mas lenta por el dolor de rodilla y peso mas bajo) mitad 10x14 MVC (acalambrándose isquio izquierdo probablemente por asimetría protegiendo RK) ultima 10x15 MVC (tengo que subir y hacer menos repes aunque sea aislamiento porque me acalambra)
-> 15x10` },

  // ───────── Pecho y Bíceps
  { name: 'Banco plano', day: 'pecho', type: 'compuesto', inc: 2.5, history: `
-> 37,5x10 mitad 40x7 MVC
-> 40x7 MVC segunda 37,5x8 MVC (quise hacer x9 pero no llegué a subir y tuve que tirar los discos) tercera 37,5x7 (no hice la 8 porque ya estaba jugado) 37,5x7 MVC (se nota la diferencia de que este sea el segundo ejercicio y no el primero)
-> 37,5x4 MVC (ultimo ejercicio, no hacer nunca mas esto xd) 30x8 ultima 30x10 MVC (no dejar para lo último)
-> 40x10 mitad 40x7 MVC ultima 40x7 MVC (re bien, seguir por acá)
-> cambio a barra olímpica 15 -> 20. 20x10 segunda 30x8 tercera 30x6 ultima 30x6 MVC (aprendo a usar la barra y el banco, no ir tan para atrás en el banco porque me choca la barra, puedo arrancar en 30 la prox)
-> 50x10 MVC (empiezo a contar la barra también, concentrado mucho en el movimiento de la barra, que no toque, no fué la mejor serie) segunda 50x7 tercera 50x5 MVC ultima 44x10 MVC (mucho mejor, puedo arrancar con esto a 12 repes la prox)
-> 50x10 segunda 50x9 mitad 50x7 ultima 50x5 (capaz una mas podía pero medio matado, seguir intentando mejorando la técnica que voy bien, a 12 la primera, buscar estar arriba de 8 en la tercera la prox vez)
-> 50x9 segunda 50x9 MVC mitad 50x5 ultima 50x6 MVC (cansancio repentino a mitad, no sé por qué, seguro por la vuelta a entrenar y día pesado)
-> 40x12 ultima 40x12 (vuelvo del GF)
-> 50x10 MVC segunda 50x9 MVC mitad 50x7 MVC ultima 50x7 MVC (nice)
-> 50x10 (arranqué medio mal con el hombro y preferí dejar hasta acá) segunda 50x10 MVC mitad 50x8 MVC (muy arriesgado, llegué a colgar la barra de pedo) última 50x6 MVC` },
  { name: 'Press inclinado con mancuernas', day: 'pecho', type: 'compuesto', inc: 2, history: `
-> 10x10 ultima 10x11 MVC (mejoré técnica, se siente mejor el pecho)
-> 12x10 ultima 12x13 MVC (primer ejercicio)
-> 12x10 ultima 14x11 MVC (primer ejercicio)
-> 12x10 ultima 12x10 MVC (mucho uso de los brazos, va a ser necesario mejorar la técnica para subir)
-> 12x10 mitad 12x10 MVC ultima 12x11 MVC (mejoré un poco la técnica, no separar tanto los codos del torso)
-> 12x10 ultima 12x12 MVC
-> 20° -> 12x12 ultima 12x12 MVC (ya puedo subir y x8)
-> 30° -> 14x8 ultima 14x10 MVC (sólido)
-> 30° -> 14x8 MVC (mala técnica, dolor de hombro) segunda 10x8 (muy difícil este ejercicio con dolor de hombro, lo anulo)
-> 30° -> 14x12 (tiemblo un poco, controlar mas) segunda 14x10 MVC mitad 14x9 MVC ultima 14x8 MVC (en general mucha carga de tríceps, capaz puedo bajar un poco menos, bajar a 12 y mejorar la técnica porque me fatigó mucho)
-> 30° -> 12x13 MVC (mejoro técnica bajando menos) segunda 12x12 MVC mitad 12x11 MVC ultima 12x13 MVC (pegué mejor la lumbar y cambió un poco)` },
  { name: 'Apertura', day: 'pecho', type: 'aislamiento', inc: 2.5, history: `
-> 32,5x10 segunda 35x10 ultima 35x10 MVC (primer ejercicio)
-> 35x10 mitad 35x9 MVC ultima 35x8 MVC (tercer ejercicio)
-> 35x10 mitad 35x9 MVC ultima 37,5x8 MVC (segundo ejercicio, un poquito de contractura en la espalda, mejoro técnica, mas al pecho, menos flexión de codo)
-> 37,5x10 mitad 37,5x8 MVC ultima 37,5x7 MVC
-> 37,5x10 segunda 37,5x9 MVC mitad 37,5x10 MVC ultima 37,5x10 MVC
-> 37,5x10 segunda 37,5x9 MVC mitad 37,5x7 MVC ultima 35x7 MVC (no sé a qué se debe la baja, capaz carbos, capaz tercer día seguido en el gym, puedo meter Core en el medio tal vez)
-> 40x10 segunda 40x9 MVC mitad 40x8 ultima 40x8 (sobra, como para meter 40x10 la prox)
-> 40x10 mitad 40x8 MVC ultima 40x10 MVC (con mas descanso)
-> 40x8 MVC segunda 37,5x8 MVC mitad 35x7 MVC (me fatigué demasiado, dejo de hacer pecho, para la prox bajo el inclinado con mancuernas)
-> 35x13 MVC segunda 35x10 MVC mitad 35x9 MVC ultima 35x8 MVC` },
  { name: 'Curl bíceps con mancuernas', day: 'pecho', type: 'aislamiento', inc: 2, history: `
-> Banco Scott -> 10x10 mitad 10x10 MVC (dolor de muñeca) ultima 10x8 MVC (no sentí mejoras en la muñeca)
-> 10x10
-> 10x10 ultima 10x10 MVC (saco la rotación de muñeca porque me generaba un dolor en la muñeca izquierda, se parece a un scott)
-> 10x10 ultima 10x11 MVC
-> 10x10 ultima 10x9 MVC (cambio un poco la técnica en cuanto a la flexión de codos, ojo con la muñecas)
-> 10x10 ultima 10x8 MVC
-> 10x12 segunda 10x10 mitad 10x10 ultima 10x8 MVC
-> 10x12 segunda 10x12 mitad 10x10 ultima 10x10 MVC
-> 10x12 segunda 10x10 mitad 10x8 (dolor de muñeca) no hago la última, está de mas
-> 10x12 segunda 10x13 mitad 10x12 ultima 10x12 MVC (ultima serie aflojando abajo todas las repes, es muy diferente)
-> 10x14 MVC segunda 10x15 MVC (segunda serie después de hacer 2 ejercicios de pecho en el medio je, descansó el biceps) mitad 10x9 MVC (subí mucho la segunda para lo que venía haciendo) ultima 10x8 MVC
-> 10x13` },

  // ───────── Espalda y Tríceps
  { name: 'Dorsales', day: 'espalda', type: 'compuesto', inc: 5, history: `
-> 40x10 segunda 45x10 MVC tercera 45x10 MVC ultima 50x9 MVC (técnica medio floja, 45 está ok para mejorar técnica, arrancar con 45 y de última bajar peso)
-> dominadas -> x5 segunda x4 tercera x3
-> 45x7 MVC (mucho para empezar como segundo ej) segunda 40x10 ultima 40x14 MVC
-> 40x10 mitad 40x10 (reduzco velocidad para cuidar el codo) ultima 40x13 MVC
-> dominadas -> x4 segunda x4 ultima x3
-> dominadas -> x7 segunda x5 ultima x3
-> dominadas -> x6 segunda x4 ultima x3 (ultima durísima, se me baja un poquito la presión)
-> dominadas -> x6 MVC segunda x5 MVC ultima x3
-> dominadas -> x7 MVC segunda x5 MVC ultima x4 MVC
-> dominadas -> x6 MVC x4 MVC ultima
-> 40x10 ultima 40x13 MVC` },
  { name: 'Remo sentado', day: 'espalda', type: 'compuesto', inc: 5, history: `
-> 40x8 MVC (mala técnica) segunda 35x10 mitad 35x10 (mejoro la técnica, codos pegados al cuerpo) ultima 40x8 MVC (mejor técnica pero puedo mejorar cambiando la altura a la que tiro el remo)
-> 35x10 ultima 35x13 MVC
-> 35x10 ultima 35x11 MVC (mejoro la técnica haciendo mas lento)
-> 35x10 mitad 40x10 ultima 40x11 MVC (mucha potencia)
-> 35x10 ultima 35x13 MVC (se sintió distinto, pensar en no flexionar tanto el codo en la técnica sino llevar el esfuerzo a la espalda)
-> 35x10 mitad 35x10 MVC (cambio técnica porque me parecía mejor tirar un poco mas desde arriba pero todavía no sé) ultima 35x14 MVC (mucho antebrazo y bíceps, aplica para EMG)
-> 35x12 segunda 35x12 mitad 35x12 ultima 35x12 (me gustaría bajar el peso y mejorar la técnica, probar 30x12 o 35x8 con este cambio)
-> 40x10 segunda 40x8 mitad 40x10 ultima 40x8 (próxima 40x8 bien lento)` },
  { name: 'Pull over', day: 'espalda', type: 'aislamiento', inc: 5, history: `
-> 35x10 ultima 40x8 MVC (se complicó la técnica con 40, seguir practicando)
-> 35x10 ultima 35x9 MVC (me falló la técnica en la última, sentí que estaba cargando mucho el hombro/triceps izquierdo)
-> 35x10 tercera 35x9 MVC ultima 35x7 MVC (al fallo si sigo me lastimo el hombro)
-> 30x10 segunda 15x10 muy lento mitad 25x10 ultima 30x10 MVC (tuve que trabajar mucho la técnica por un dolor fuerte de codo, agarre mas amplio, saco mas culo)
-> 30x10 segunda 35x10 mitad 35x8 MVC ultima 35x10 MVC (mejorar técnica con este peso, no subir hasta que eso pase)
-> 30x10 segunda 30x10 MVC (la última salió mal, usé mucho hombros) mitad 30x10 ultima 35x8 MVC
-> 30x7 (no me gustó la técnica y bajé a 25) 25x10 mitad 30x10 ultima 30x10 MVC (la segunda ayudó mucho para la técnica)
-> 30x10 ultima 30x8 MVC
-> 30x10 segunda 30x9 MVC mitad 25x10 ultima 25x12 MVC (miré un poco mas los músculos involucrados, puedo volver a 30 manteniendo la técnica)
-> 25x12 MVC segunda 25x13 MVC (todo cuestión de técnica) mitad
-> 30x10 ultima 30x8 MVC (por tríceps, buscar 30x9 lento)` },
  { name: 'Tríceps en polea con soga', day: 'espalda', type: 'aislamiento', inc: 5, history: `
-> 25x10 ultima 25x11 MVC (cambio técnica cambiando a la soga negra, muy buena)
-> 25x10 mitad 25x9 MVC ultima 25x9 MVC
-> 25x10 mitad 25x9 MVC ultima 25x10 MVC
-> 25x10 mitad 25x10 MVC ultima 25x7 MVC (cansado?)
-> 25x12 segunda 25x9 MVC mitad 25x8 MVC ultima 25x8 MVC (re duros los triceps)
-> 25x13 MVC segunda 25x11 MVC mitad 25x9 MVC ultima 25x9 MVC
-> 25x15 segunda 25x12 MVC mitad 25x8 MVC ultima 25x9 MVC (tríceps infladísimos)
-> 25x12 mitad 25x11 MVC ultima 25x10 MVC (pequeño mareo)` },

  // ───────── Hombros y Brazos
  { name: 'Vuelo lateral', day: 'brazos', type: 'aislamiento', inc: 1, history: `
-> 8x10 ultima 8x15 MVC
-> 8x10 segunda 5x10 (cambio la técnica, estaba haciendo cualquier cosa) ultima 5x10 MVC (la prox puedo arrancar con 6 y seguir mejorando la técnica)
-> 6x10 ultima 5x12 MVC (me cuesta mejorar la técnica, justo tuve un dolor de mano izquierda que me re jodió)
-> 6x10 ultima 6x12 MVC (mejorar técnica para sentir mas el hombro, dolor de lumbar de la bici el finde)
-> 6x10 ultima 6x15 MVC (puedo subir a 7 ya)
-> pruebo mas repes antes de subir peso. Bajé a 2,5Kg concentrándome en el hombro, durísimo, todavía no lo engancho, 6x10 segunda 2,5x10 ultima 2,5x11 MVC (mejorar técnica)
-> 2x15 fácil segunda 3x13 mitad 3x12 MVC (la 13 no salió bien la técnica) ultima 3x13 MVC (un poco de dolor de hombro derecho recuperandose)
-> 3x12 segunda 4x14 MVC (paso laterales a primer ejercicio) mitad 4x14 MVC ultima 4x14 MVC (buscar 4x15)
-> 4x15 (puedo pasar a 5x6)` },
  { name: 'Press militar con mancuernas', day: 'brazos', type: 'compuesto', inc: 2, history: `
-> 10x10 ultima 12x12 MVC
-> 10x10 mitad 12x10 ultima 12x11 MVC
-> 10x10 segunda 12x10 ultima 12x8 MVC (mantener acá, no subir la prox y aumentar repes, ir probando técnica)
-> 10x12 mitad 12x12 ultima 12x10 MVC
-> 10x12 mitad 10x12 MVC ultima 10x11 MVC (próxima 10x12 está bien, para la otra subir)
-> 10x12 mitad 10x12 ultima 10x14 MVC (puedo subir a 12x8)` },
  { name: 'Vuelo frontal', day: 'brazos', type: 'aislamiento', inc: 0.5, history: `
-> 7,5x10 ultima 7,5x15 MVC
-> 7,5x10 mitad 8x10 ultima 8x14
-> 7x10 segunda 7,5x10 mitad 8x10 ultima 8x12 MVC
-> 7,5x10 ultima 7,5x20 MVC (ultimo ejercicio, claramente puedo subir a 8)
-> 8x10 ultima 8x11 MVC (segundo ejercicio)
-> 8x12 ultima 8x13 MVC
-> 8x10 ultima 8x10 (costó pero ok)
-> 7,5x10 segunda 7,5x12 mitad 7,5x12 MVC ultima 7,5x12 MVC (mantener este peso y subir repes)
-> 7,5x15 mitad 7,5x15 MVC ultima 7,5x` },
  { name: 'Tríceps en polea con barra', day: 'brazos', type: 'aislamiento', inc: 5, history: `
-> 25x10 ultima 30x15 MVC
-> 30x10 ultima 30x13 MVC (mejoré técnica, mejor recorrido circular, sin tanta compensación de la espalda)
-> 30x10 segunda 25x10 (lo hago mas lento por un dolor de codo fuerte, vuelvo rápido) ultima 30x11 MVC (llego a subir porque el codo estaba bien entrado en calor ya)
-> 30x10 (arranco con dolor de codo izquierdo) mitad 30x10 (menos rotación de muñeca, me duele menos y trabaja mas el triceps) 30x13 MVC (son dolor de muñeca y yendo bien al fallo)
-> 30x10 mitad 35x10 ultima 35x10 MVC
-> 30x10 mitad 30x12 ultima 30x15 MVC (mejoro mucho la técnica, resto del cuerpo mas quieto, pulgar arriba de la barrita, se siente mejor)
-> 30x12 segunda 30x9 MVC mitad 30x7 MVC ultima 30x7 MVC (mantener peso, puedo empezar con 10 repes)
-> 30x15 mitad 30x15 MVC última 30x12 MVC (en la última mejoro la técnica intentando quebrar la barra y cambia bastante, mantener 30x15 con esta técnica)
-> 30x12 segunda 30x15 mitad 30x14 MVC ultima 30x13 MVC` },
  { name: 'Bíceps en polea con barra', day: 'brazos', type: 'aislamiento', inc: 5, history: `
-> 20x10 segunda 25x10 ultima 25x10 MVC
-> 20x10 segunda 25x10 mitad 30x15 MVC (arrancar con 25 la prox, dolor de muñeca)
-> 25x10 ultima 25x11 MVC (lo mismo que en triceps, bien lento y recupero rápido para arrancar la prox repe)
-> 25x10 mitad 30x10 ultima 30x12 MVC (leve dolor en muñeca izquierda, es un tema de técnica y control en las últimas repes)
-> 25x10 mitad 30x10 ultima 30x12 MVC (sin dolor de muñeca)
-> 25x12 mitad 25x13 MVC ultima 25x15 MVC (mas balanceo de codos en la última, tal vez ahí reduje la carga de bíceps y pude hacer mas)
-> 25x12 ultima 25x13 MVC.
-> 25x15 (no subo hasta arriba de todo porque afloja) segunda 25x12 MVC mitad 25x13 MVC ultima 25x14 MVC
-> 25x15 segunda 25x14 MVC mitad 25x12 MVC (ultima, se notó la fatiga, puede ser el calor)` },

  // ───────── Core
  { name: 'Plancha abdominal', day: 'core', type: 'core', inc: 0, history: `
-> 30seg x3 (arrancar acá, subir a 45seg cuando salga cómodo)
-> 45seg x3
-> 75seg x3
-> 60seg x3` },
  { name: 'Plancha lateral', day: 'core', type: 'core', inc: 0, history: `
-> 20seg x3 cada lado
-> 30seg x3 x lado
-> 40seg x3
-> 30seg x3` },
  { name: 'Dead bug', day: 'core', type: 'core', inc: 0, history: `
-> x10 cada lado x3 (movimiento lento, espalda baja pegada al piso)
-> x10 x3
-> x5 segunda x7 ultima x7
-> x7 segunda x8 ultima x9` },
  { name: 'Elevación de piernas colgado', day: 'core', type: 'core', inc: 0, history: `
-> x8 x3 (rodillas flexionadas si no sale con piernas rectas)
-> x10 x3
-> x10 x3` },
  { name: 'Ruedita', day: 'core', type: 'core', inc: 0, history: `
-> 60seg x3` },
  { name: 'Bird dog', day: 'core', type: 'core', inc: 0, history: `
-> x10 cada lado x3 (pausa de 2seg arriba)` },
  { name: 'Farmers walk', day: 'core', type: 'core', inc: 0, history: `
-> 20 x lado` },
];

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Datos de la planilla "Rutina noviembre": nombres, foco y ejercicios nuevos */
const NOVIEMBRE: Record<string, { name?: string; cue: string }> = {
  dorsales: { cue: 'Pecho alto, costillas abajo; no te arquees para tirar más. Bajá la velocidad si molesta el codo.' },
  dominadas: { cue: 'Glúteos y abdomen firmes, sin balanceo ni arquear la lumbar.' },
  'remo-sentado': { cue: 'Tronco quieto: el movimiento sale de la espalda, no de la lumbar. Codos pegados.' },
  'pull-over': { cue: 'Costillas abajo; no arquees la lumbar al estirar. Si molesta el hombro o el codo, bajá el peso.' },
  'triceps-en-polea-con-soga': { name: 'Tríceps en poleas con soga', cue: 'Tronco firme, sin compensar con la espalda.' },
  'mini-core-lumbar': { name: 'Mini-core lumbar (bird dog + dead bug)', cue: '2 rondas: bird dog 8 por lado (pausa 2 s arriba) + dead bug 8 por lado, lento, lumbar pegada al piso. Se hace en los días sin Core.' },
  'banco-plano': { cue: 'Escápulas atrás y abajo, arco leve y cómodo, pies firmes. No fuerces la lumbar.' },
  'press-inclinado-con-mancuernas': { name: 'Press inclinado con mancuernas (30°)', cue: 'Costillas abajo, lumbar apoyada en el respaldo; codos no tan abiertos.' },
  apertura: { cue: 'Poco flexión de codo, llevar el movimiento al pecho, sin arquear.' },
  'curl-biceps-con-mancuernas': { name: 'Curl bíceps con mancuernas (banco Scott)', cue: 'Sin balanceo del tronco. Ojo con la muñeca.' },
  'plancha-abdominal': { cue: 'Costillas abajo, pelvis neutra, glúteo apretado. Cortá la serie cuando se te hunde la lumbar.' },
  'plancha-lateral': { cue: 'Cadera arriba y alineada; no rotes el torso.' },
  'dead-bug': { cue: 'Lumbar pegada al piso todo el tiempo; lento.' },
  'bird-dog': { cue: 'Columna neutra, pausa 2 s arriba, sin rotar la cadera. Hacelo en todas las sesiones de core.' },
  'curl-up-mcgill': { name: 'Curl-up (McGill)', cue: 'Una pierna flexionada, manos bajo la lumbar. Subí solo cabeza y hombros y aguantá 8–10 s. Pirámide 6-4-2.' },
  'maleta-suitcase-carry': { name: 'Maleta (suitcase carry)', cue: 'Mancuerna de un solo lado, 20–30 m por lado, torso derecho sin inclinarte. Alterná con el farmers walk.' },
  'farmers-walk': { cue: 'Postura alta, costillas abajo, pasos cortos.' },
  'elevacion-de-piernas-colgado': { cue: 'Sin balanceo. Si molesta la lumbar, rodillas flexionadas y pelvis hacia atrás (cola metida).' },
  ruedita: { cue: 'Pausá mientras haya dolor lumbar, o hacé rango corto sin dejar caer la pelvis.' },
  'bisagra-de-cadera-con-baston': { name: 'Bisagra de cadera con bastón (técnica)', cue: 'Bastón pegado a nuca, espalda y sacro. Cadera atrás, rodillas apenas flexionadas, columna neutra. 2x10 lento, antes de la prensa.' },
  prensa: { cue: 'Bajá solo hasta donde la lumbar siga pegada al respaldo (que no se despegue la pelvis). Tenés fuerza de sobra en ese rango.' },
  rdl: { name: 'RDL (reintroducir liviano)', cue: 'Volvé cuando no duela. Mancuerna o kettlebell liviana pegada al cuerpo, bajá hasta media espinilla o hasta sentir isquios, sin redondear.' },
  'pull-through-en-polea': { name: 'Pull-through en polea', cue: 'Cadera atrás, espalda neutra, apretá el glúteo arriba sin arquear. 3x12.' },
  'hip-thrust': { name: 'Hip thrust', cue: 'Quedate en 40–50 kg. Arriba: costillas abajo, pelvis levemente hacia atrás, sin arquear. Frená cuando la cadera quede alineada con el torso.' },
  'back-extension-45': { name: 'Back extension 45° (foco glúteo)', cue: 'Subí hasta quedar en línea, sin hiperextender la lumbar. 2–3x10–12.' },
  abductores: { cue: 'Aguantá 1 seg al final. Pensar en la bici.' },
  gemelos: { cue: 'Aguantá 1 seg arriba.' },
  isquios: { cue: 'Técnica lenta; revisá que no compensen los gemelos.' },
  'vuelo-lateral': { cue: 'Codos levemente flexionados, sin impulso del tronco.' },
  'press-militar-con-mancuernas': { cue: 'Glúteos y abdomen firmes. Si arqueás la lumbar, usá respaldo y bajá el peso.' },
  'vuelo-frontal': { cue: 'Sin balanceo del tronco.' },
  'triceps-en-polea-con-barra': { name: 'Tríceps en poleas con barra', cue: 'Tronco quieto, pulgar arriba de la barra.' },
  'biceps-en-polea-con-barra': { name: 'Bíceps en poleas con barra', cue: 'Sin balancear, codos pegados.' },
};

const NEW_EXERCISES: { id: string; type: ExerciseType; inc: number }[] = [
  { id: 'mini-core-lumbar', type: 'core', inc: 0 },
  { id: 'curl-up-mcgill', type: 'core', inc: 0 },
  { id: 'maleta-suitcase-carry', type: 'core', inc: 0 },
  { id: 'bisagra-de-cadera-con-baston', type: 'compuesto', inc: 0 },
  { id: 'pull-through-en-polea', type: 'compuesto', inc: 5 },
  { id: 'back-extension-45', type: 'aislamiento', inc: 5 },
];

const NOVIEMBRE_DAYS: Record<string, string[]> = {
  espalda: ['dorsales', 'dominadas', 'remo-sentado', 'pull-over', 'triceps-en-polea-con-soga', 'mini-core-lumbar'],
  pecho: ['banco-plano', 'press-inclinado-con-mancuernas', 'apertura', 'curl-biceps-con-mancuernas', 'mini-core-lumbar'],
  core: ['plancha-abdominal', 'plancha-lateral', 'dead-bug', 'bird-dog', 'curl-up-mcgill', 'maleta-suitcase-carry', 'farmers-walk', 'elevacion-de-piernas-colgado', 'ruedita'],
  piernas: ['bisagra-de-cadera-con-baston', 'prensa', 'rdl', 'pull-through-en-polea', 'hip-thrust', 'back-extension-45', 'abductores', 'gemelos', 'isquios'],
  brazos: ['vuelo-lateral', 'press-militar-con-mancuernas', 'vuelo-frontal', 'triceps-en-polea-con-barra', 'biceps-en-polea-con-barra', 'mini-core-lumbar'],
};

export const HABITS: Habit[] = [
  { id: 'flexor-cadera', name: 'Flexor de cadera en media rodilla', kind: 'Movilidad', dose: '2x30–45 s por lado', how: 'Rodilla apoyada, glúteo apretado, pelvis hacia atrás (cola metida). Sentí el estiramiento adelante de la cadera, sin arquear la lumbar.' },
  { id: '90-90', name: '90/90', kind: 'Movilidad', dose: '2x8 transiciones lentas', how: 'Sentado con ambas rodillas a 90°, pasá de un lado al otro, espalda larga.' },
  { id: 'rock-back', name: 'Balanceo hacia atrás en cuadrupedia (rock back)', kind: 'Movilidad', dose: '2x10', how: 'Manos y rodillas, columna neutra, llevá la cadera hacia los talones sin redondear.' },
  { id: 'gato-camello', name: 'Gato-camello', kind: 'Movilidad', dose: '2x10 lentos', how: 'Mové de a poco, dentro del rango sin dolor.' },
  { id: 'isquios-suave', name: 'Isquios suave (boca arriba, con banda o toalla)', kind: 'Movilidad', dose: '2x30 s por lado', how: 'Rodilla apenas flexionada; no tires fuerte.' },
  { id: 'caminata', name: 'Caminata', kind: 'Hábito', dose: '20–30 min', how: 'A diario si podés.' },
  { id: 'natacion', name: 'Natación (opcional)', kind: 'Cardio', dose: '1x por semana, 20–30 min suave', how: 'Complementa, no reemplaza lo de arriba.' },
];

export function buildSeed(): AppState {
  const exercises: Exercise[] = [];
  const entries: Entry[] = [];
  const oldDays: Record<string, string[]> = {};
  for (const s of SEED) {
    const id = slug(s.name).replace('hip-thrust-barra-de-hip-thrust', 'hip-thrust');
    const [repMin, repMax] = RANGES[s.type];
    exercises.push({ id, name: s.name, type: s.type, repMin, repMax, increment: s.inc });
    (oldDays[s.day] ??= []).push(id);
    const lines = s.history
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('->'))
      .map((l) => l.replace(/^->\s*/, ''));
    lines.forEach((line, i) => {
      const p = s.type === 'core' ? { sets: [], note: undefined, variant: undefined } : parseLine(line);
      // en la planilla nueva las dominadas son un ejercicio aparte
      const isDominadas = id === 'dorsales' && p.variant === 'dominadas';
      entries.push({
        id: `${id}-h${i + 1}`,
        exerciseId: isDominadas ? 'dominadas' : id,
        seq: i + 1,
        sets: p.sets,
        note: p.note,
        variant: isDominadas ? undefined : p.variant,
        raw: isDominadas ? line.replace(/^dominadas\s*->\s*/, '') : line,
        imported: true,
      });
    });
  }
  oldDays.espalda.splice(oldDays.espalda.indexOf('dorsales') + 1, 0, 'dominadas');
  exercises.push({ id: 'dominadas', name: 'Dominadas', type: 'compuesto', repMin: 8, repMax: 12, increment: 2.5 });
  for (const n of NEW_EXERCISES) {
    const [repMin, repMax] = RANGES[n.type];
    exercises.push({ id: n.id, name: n.id, type: n.type, repMin, repMax, increment: n.inc });
  }
  for (const ex of exercises) {
    const o = NOVIEMBRE[ex.id];
    if (o) {
      ex.cue = o.cue;
      if (o.name) ex.name = o.name;
    }
  }
  const noviembre: Routine = {
    id: 'rutina-noviembre',
    name: 'Rutina noviembre',
    days: ROTATION.map((d) => ({ id: `nov-${d}`, name: DAY_NAMES[d], exerciseIds: NOVIEMBRE_DAYS[d] })),
  };
  const anterior: Routine = {
    id: 'rutina-anterior',
    name: 'Rutina anterior',
    days: ROTATION.map((d) => ({ id: `ant-${d}`, name: DAY_NAMES[d], exerciseIds: oldDays[d] })),
  };
  return {
    version: 2,
    exercises,
    routines: [noviembre, anterior],
    activeRoutineId: noviembre.id,
    entries,
    habits: HABITS,
    daily: {},
  };
}
