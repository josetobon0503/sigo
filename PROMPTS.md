# Sigo: guía de prompts para Claude Code

Este archivo es tu hoja de ruta. Copias un prompt, lo pegas en Claude Code, revisas, pruebas en tu iPhone, haces commit y pasas al siguiente.
`CLAUDE.md` es el "cerebro" del proyecto: Claude Code lo lee solo cada vez que abres una sesión en la carpeta.

---

## 0. Preparar tu PC con Windows (una sola vez)

1. **Node.js LTS**: descárgalo de nodejs.org e instálalo con las opciones por defecto.
2. **Git for Windows**: git-scm.com/downloads/win. Claude Code lo usa para la terminal Bash.
3. **VS Code**: code.visualstudio.com.
4. **Claude Code en VS Code**: usa la extensión de Claude Code (icono de chispa). La extensión ya trae Claude Code;
   no hace falta instalar nada más. (Necesitas un plan de pago de Claude; el plan gratis no incluye Claude Code).
5. **En tu iPhone**: instala **Expo Go** desde el App Store. Tu PC y tu iPhone deben estar en el mismo Wi-Fi.
6. **GitHub**: crea un repo **público** llamado `sigo` en github.com/josetobon0503 (público = sirve para el resume).

Luego:
1. Crea la carpeta `C:\dev\sigo` y, en VS Code, ábrela con **File > Open Folder**.
2. Arrastra **CLAUDE.md** y **PROMPTS.md** desde Descargas al panel **Explorer** de VS Code (la barra de la izquierda). Así quedan dentro de la carpeta.
3. Abre CLAUDE.md y haz clic en el icono de **chispa** arriba a la derecha para abrir el panel de Claude.

## Reglas de oro al trabajar con Claude Code

- **Un prompt por fase.** No le pidas toda la app de una vez.
- **Primero el plan.** Para las fases grandes, haz clic en el indicador de modo abajo del cuadro de texto y elige **plan mode** (o escribe `/plan`). Pega el prompt, lee el plan y solo entonces apruébalo.
- **Prueba en tu iPhone después de cada fase**: abre la terminal de VS Code (**Terminal > New Terminal**), ejecuta `npx expo start` y escanea el QR con la cámara.
- **Commit después de cada fase que funcione:** `git add . && git commit -m "..."` y luego `git push`. Si algo se rompe, siempre puedes volver atrás.
- **Si algo falla**, pégale el error completo: "Esto falló en mi iPhone: [error]. Arréglalo".
- **Conversación nueva por fase** (botón de nueva conversación en el panel de Claude, o `/clear`), para que no arrastre contexto viejo. CLAUDE.md le da todo lo necesario.

---

## Fase 1: Proyecto, tema, idiomas y pestañas

```
Lee CLAUDE.md completo. Vamos a empezar la Fase 1.

Crea el proyecto Expo en esta carpeta (sin borrar CLAUDE.md ni PROMPTS.md) con TypeScript strict y Expo Router.
Configura:
- La estructura de carpetas exacta de la sección 4.
- src/theme/tokens.ts con los colores, la tipografía y los espaciados de la sección 7, con modo claro y oscuro.
- i18n con i18next + expo-localization: es.json y en.json; el idioma por defecto es el del teléfono.
- Las pestañas Hoy / Dolor / Perfil con pantallas placeholder que usen los textos traducidos y los iconos de Ionicons.
- Componentes base: BigButton (variantes primary, secondary, alert; 56 pt de alto mínimo), Card, Chip, ScreenContainer.
- Jest (jest-expo), ESLint y Prettier, con los scripts test, lint y typecheck en package.json.
- Un .gitignore correcto y un README.md en inglés con la descripción del proyecto.

Muéstrame primero el plan. Al terminar, corre typecheck, test y lint, actualiza Status en CLAUDE.md
y explícame en español cómo abrirlo en mi iPhone con Expo Go.
```
**Verifica:** la app abre en tu iPhone, se ven las 3 pestañas y en español si tu teléfono está en español.

---

## Fase 2: Biblioteca de ejercicios y motor de reglas (el corazón)

```
Lee CLAUDE.md. Fase 2: el motor y la biblioteca.

1. Crea src/engine/types.ts con el modelo de la sección 5.
2. Crea src/data/exercises.ts con 30 ejercicios para adultos de 50+ en casa (sin ejercicios en el piso),
   en español y en inglés. Cubre todos los patrones, con varios niveles por patrón y versiones sentadas o con
   apoyo para cada uno. Cada ejercicio lleva purpose, steps (3-5) y mistakes (2-3), con frases simples.
   Marca todos con reviewedByProfessional: false.
3. Implementa generator.ts, swap.ts, progression.ts y safety.ts siguiendo exactamente las reglas de la sección 6.
   Son funciones puras, sin React.
4. Escribe tests para cada regla, incluidos los casos borde: dolor punzante, sin candidatos, todas las zonas
   bloqueadas, seatedOnly, ejercicio evitado que ya venció, determinismo con la misma fecha.
5. Agrega una prueba de cobertura de la biblioteca: para cada patrón y cada zona del cuerpo, que exista al menos un
   ejercicio de ese patrón que NO cargue esa zona (si no existe, agrega ejercicios hasta que pase).

Plan primero. Al final dame una tabla en español con los 30 ejercicios (patrón, posición, nivel, zonas que carga)
para que se la muestre a un fisioterapeuta.
```
**Verifica:** `npm test` pasa en verde. Guarda la tabla: es lo que le vas a llevar al fisioterapeuta.

---

## Fase 3: Onboarding y perfil

```
Lee CLAUDE.md. Fase 3: el onboarding de la sección 8 y el store del perfil.

- Store de Zustand para el perfil, persistido con AsyncStorage.
- Flujo de primera vez: Bienvenida + idioma -> Aviso (no es consejo médico) -> Cuestionario de preparación
  (sección 6, con el texto en un archivo aparte marcado NEEDS PROFESSIONAL REVIEW) -> Nombre y rango de edad ->
  Dónde duele (mapa del cuerpo simple con zonas tocables + chips, con lado izquierdo/derecho cuando aplique) ->
  Qué tan fuerte (5 caritas con texto) -> Equipo que tengo -> Hora del recordatorio -> Listo.
- Si responde "sí" a alguna pregunta del cuestionario: aplica la regla de seatedOnly y niveles en 1, y muestra
  el mensaje de hablar con su doctor.
- Barra de progreso arriba, botón Atrás grande, un solo paso por pantalla y textos cortos.
- Si el onboarding ya se completó, la app abre directo en Hoy.
- Pantalla Perfil funcional: editar nombre, idioma, equipo, el switch seatedOnly, Safety Tips y Acerca de.

Plan primero. Al final explícame cómo reiniciar el onboarding para probarlo varias veces.
```
**Verifica:** completa el onboarding como "María" (rodilla izquierda moderada + espalda baja leve), cierra la app y vuelve a abrirla: tus datos siguen ahí.

---

## Fase 4: Pantalla Hoy y sesión de entrenamiento

```
Lee CLAUDE.md. Fase 4.

- Pantalla Hoy: usa generateWorkout con el perfil y el historial. Muestra el resumen, la píldora
  "Consideramos: rodilla y espalda baja", la lista de ejercicios, Equipo necesario, la nota de patrones omitidos
  y un botón grande Empezar.
- Sesión en modal: pantalla de ejercicio (área de video placeholder, nombre, pasos cortos, serie y repeticiones
  o temporizador grande, botón Hecho y botón rojo "Me duele" de 64 pt; el botón Me duele por ahora solo muestra
  un alert) -> Descanso (cuenta regresiva de 30 s, siguiente ejercicio, Saltar) -> ... -> Final (resumen y
  "¿Cómo te sientes?" con 5 caritas).
- Guarda un WorkoutLog en el historial. Haptics al terminar una serie, expo-keep-awake durante la sesión.
- Botón Salir con confirmación ("¿Seguro que quieres terminar?").

Plan primero.
```
**Verifica:** haz una rutina completa en tu sala con el teléfono apoyado. ¿Se lee desde lejos? Anota lo que no.

---

## Fase 5: Flujo "Me duele", seguridad y cambio de ejercicio

```
Lee CLAUDE.md. Fase 5: el diferenciador de la app.

- "Me duele" abre el flujo de la sección 8: zona (preseleccionada con las zonas que carga el ejercicio actual),
  intensidad, switch "¿Es un dolor punzante?" y el enlace rojo "¿Dolor de pecho o mareo?".
- Usa findSwap. Según el resultado:
  - safety -> pantalla de Seguridad (Llamar al 911 con tel:911, "Estoy bien, seguir", "Terminar").
  - swap -> Sugerencia: el nuevo ejercicio + una frase de por qué + Cambiar y seguir / Ver ejercicio / Saltar y descansar.
  - rest -> mensaje de descanso y pasa al siguiente ejercicio.
- Al aceptar el cambio, la sesión continúa sin perder el progreso; el WorkoutItem guarda swappedFrom y painReported.
- Actualiza el store: el ejercicio va a avoided por 14 días y la zona de dolor sube en el perfil.
- Pestaña Dolor funcional: mapa del cuerpo, lista de zonas, agregar, editar y quitar.
- Tests de integración del flujo con React Native Testing Library.

Plan primero.
```
**Verifica:** en una sentadilla, marca rodilla moderada: debe sugerir otro ejercicio de piernas que no cargue la rodilla. Marca "punzante": debe ir a Seguridad, nunca a un cambio.

---

## Fase 6: Progresión y pestaña Progreso

```
Lee CLAUDE.md. Fase 6.

- Después de cada entrenamiento aplica updateLevels y guarda el perfil.
- Agrega una cuarta pestaña, Progreso: entrenamientos de esta semana, racha amable (sin castigar si un día falla),
  minutos totales, cómo se ha sentido (las caritas en el tiempo) y la historia de dolor por zona.
- En Hoy, un mensaje sutil cuando sube de nivel ("¡Subiste de nivel en piernas!").

Plan primero.
```

---

## Fase 7: Videos en 3 capítulos y modo distancia

```
Lee CLAUDE.md. Fase 7.

- Componente VideoChapters con expo-video y 3 botones grandes: "Para qué sirve" / "Cómo hacerlo" /
  "Cómo NO hacerlo". Si falta el video, muestra una tarjeta con el texto de purpose, steps o mistakes.
- La fuente del video viene de exercise.video (URL o asset), lista para hacer streaming desde un CDN más adelante.
  No metas videos pesados en la app.
- Modo distancia: un switch en la pantalla de ejercicio. Video grande, contador gigante y expo-speech en el idioma
  del usuario: anuncia el ejercicio, cuenta las repeticiones despacio y avisa "descanso" y "siguiente".
  Funciona en horizontal.

Plan primero.
```

---

## Fase 8: Recordatorios, accesibilidad y pulido

```
Lee CLAUDE.md. Fase 8.

- Recordatorios locales con expo-notifications según profile.reminder, con un texto amable en el idioma del usuario.
- Revisión de accesibilidad de TODAS las pantallas: accessibilityLabel y accessibilityRole, tamaños mínimos,
  y probar con el tamaño de letra del sistema al máximo (que nada se corte ni se encime). Dame una lista de lo que corregiste.
- Revisión de textos: busca en es.json y en.json cualquier palabra prohibida de la regla 2 de CLAUDE.md y reemplázala.
- Pantalla de carga, ícono de la app y splash con los colores del style guide.

Plan primero.
```

---

## Fase 9: Publicar (TestFlight y App Store)

```
Lee CLAUDE.md. Fase 9. Guíame paso a paso en español para:
1. Configurar EAS Build (eas.json, app.json con bundle identifier, nombre, versión y permisos).
2. Crear el build de iOS en la nube desde Windows y subirlo a TestFlight.
3. Escribir una política de privacidad simple (todo local, sin datos compartidos) como página en el repo.
4. Redactar la ficha del App Store en español e inglés (nombre, subtítulo, descripción, palabras clave)
   respetando la regla 2 de CLAUDE.md, más la lista de capturas de pantalla que necesito.
```
**Nota:** para TestFlight y el App Store necesitas la Apple Developer Program (US$99 al año). Hasta la Fase 8 no la necesitas: Expo Go es gratis.

---

## Después del MVP (solo cuando tengas usuarios reales)

- Anuncios (ver la política en la sección 10 de CLAUDE.md).
- Compartir el progreso con un familiar (esto requiere backend: Supabase).
- Videos reales en un CDN con caché offline.
- Ejercicios revisados por un fisioterapeuta (reviewedByProfessional: true) y el texto "Revisado por fisioterapeutas" en la ficha.
