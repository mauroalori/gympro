# GymPro

App mobile (PWA) para registrar la rutina de gym día a día con **doble progresión**:

- **Aislamiento**: 6–15 repes. Cuando llegás a 15, la app te sugiere subir el peso y volver a 6.
- **Compuesto**: 8–12 repes. Cuando llegás a 12, te sugiere subir el peso y volver a 8.

Los rangos y el salto de peso se pueden ajustar por ejercicio.

## Qué hace

- **Rutinas**: viene con "Rutina noviembre" (la de la planilla) y "Rutina anterior". Podés crear una **rutina desde cero**, vacía, y cargarle días y ejercicios a medida que los vas probando. Si elegís un ejercicio que ya existe, trae su historial.
- **Entrenar**: sugiere el día que toca según la rotación (Espalda → Pecho → Core → Piernas → Brazos). En cada ejercicio muestra la sugerencia de peso × repes y **solo las 2 últimas veces** que lo hiciste.
- **Para hoy**: al abrir un ejercicio ves la sugerencia, el **foco** técnico fijo del ejercicio y un resumen de las notas de las 2 últimas sesiones (lo que anotaste "para la próxima" y las notas que dicen qué hacer después).
- **Registro**: series con steppers de peso y repes, botón **MVC** (al fallo), nota por serie, notas finales y **📌 Para la próxima vez**. Se guarda solo, a medida que cargás.
- **Modo texto**: podés escribir como siempre (`50x10 MVC segunda 50x9 (nota) ultima 50x6 MVC`) y la app lo interpreta.
- **Timer de descanso** fijo de 90 s, con vibración al terminar.
- **Dolor lumbar (0–10)** por día con su gráfico, y una checklist de **movilidad y hábitos**.
- **Progreso**: gráfico de 1RM estimado y de peso tope, y el historial completo, que se puede editar.
- **Backup**: exportar e importar en JSON, y exportar todo como texto en tu formato.

Todo tu historial previo viene precargado y se puede consultar.

## Instalar en el celular

1. Abrí la URL de la app en el celular (Chrome en Android, Safari en iPhone).
2. Android: menú ⋮ → *Instalar app*. iPhone: botón compartir → *Agregar a inicio*.
3. Funciona offline. Los datos quedan guardados en el teléfono, así que conviene exportar un backup cada tanto.

## Desarrollo

```bash
npm install
npm run dev      # servidor local
npm test         # tests del parser y la progresión
npm run build    # build de producción en dist/
```

Deploy: el workflow `.github/workflows/deploy.yml` publica en GitHub Pages en cada push a `main`. Para activarlo: Settings → Pages → Source: *GitHub Actions*.
