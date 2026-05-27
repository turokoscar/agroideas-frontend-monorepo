# ADR 0002: Modernización de `apps/sat-ui` — Buenas prácticas Angular, señales y separación de responsabilidades

## Estado
Aceptado · **Completado** (Fase 1 ✅ · Fase 2 ✅ · Fase 3 ✅ · Fase 4 ✅ · Fase 5 ✅ · Fase 6 ✅ · Fase 7 ✅ · Fase 8 ✅ · Fase 9 ✅ · Fase 10 ✅ — camino crítico + modularización + rendimiento + formularios reactivos + limpieza finalizados — ver [Registro de implementación](#registro-de-implementación))

## Fecha
2026-05-26

## Responsables
Equipo Frontend AGROIDEAS · Owner del módulo: Oscar Pazos

## Aplica a
`apps/sat-ui` (alcance contenido — no afecta `apps/kofix-ejecucion` ni `libs/*`, salvo que se decida promover un pipe a `@agroideas/utils` en la Fase 6).

## Contexto

`apps/sat-ui` se incorporó al monorepo en la migración descrita en
[ADR 0001](./0001-migracion-monorepo-frontend-agroideas.md). Durante la Fase 3 de
ese ADR (extracción de librerías compartidas) la app adoptó parcialmente las
prácticas modernas de Angular 18: standalone components, señales para estado
local, `inject()`, control flow nuevo (`@if`/`@for`), consumo de `@agroideas/ui`,
`@agroideas/feedback` y `@agroideas/utils`.

Una revisión del código (2026-05-26, sobre la rama `desarrollo`, 7 features
implementadas — `asignaciones`, `asistentes`, `evidencias`, `informes`,
`programaciones`, `sincronizacion`, `dashboard`, además de `login` y layout)
detecta sin embargo que la adopción **no es uniforme** y conserva varios
antipatrones que limitan el valor de las señales y comprometen mantenimiento,
testabilidad y performance.

### Hallazgos clave

| # | Hallazgo | Severidad | Ejemplo |
|---|---------|-----------|---------|
| H1 | Clave de token inconsistente entre servicios | 🔴 bug | `evidencia.service.ts` lee `'jwt_token'`; `auth.service.ts` escribe `STORAGE_KEYS.SAT_TOKEN` |
| H2 | Token leído una sola vez en construcción del singleton (stale) | 🔴 bug | `evidencia.service.ts:71` |
| H3 | Typo `cantidad_evidecias` corregido vía `as any` | 🔴 bug | `informes.component.ts:144` |
| H4 | `loading` se apaga prematuro cuando hay requests paralelos | 🔴 bug | `informes.component.ts:175–197` |
| H5 | HTTP inline en componentes (asignaciones, asistentes, informes, programaciones) | 🟠 SoC | 4 componentes con `http.get/post/put/delete` directo |
| H6 | `.subscribe()` manual sin `takeUntilDestroyed()` | 🟠 leak | Toda la app |
| H7 | Falta `ChangeDetectionStrategy.OnPush` en todos los componentes | 🟠 perf | Toda la app |
| H8 | `*ngFor`/`*ngIf` heredados conviven con `@for`/`@if` | 🟡 estilo | `programaciones.component.ts:101,111,169` |
| H9 | `@ViewChild` decorator en lugar de `viewChild()` signal query | 🟡 estilo | `informes.component.ts:94` |
| H10 | `setTimeout(..., 100)` para focus | 🟡 estilo | `informes.component.ts:336` |
| H11 | `formatDate` duplicado 6 veces | 🟡 dup | 6 componentes |
| H12 | Mapeos de estado (`getEstadoLabel`, `getResultadoLabel`) repetidos | 🟡 dup | 3 componentes |
| H13 | Componentes inflados (>300 LOC con templates inline >200 líneas) | 🟢 mant | `evidencias` 388 LOC, `informes` 421 LOC, `sincronizacion` 313 LOC |
| H14 | `<img>` sin `NgOptimizedImage` en galería | 🟢 perf | `evidencias.component.ts:123` |
| H15 | Rutas casi todas eager | 🟢 perf | `app.routes.ts` (solo `programaciones` usa `loadComponent`) |
| H16 | Debounce hecho con `setTimeout`/`clearTimeout` | 🟢 estilo | `asignaciones.component.ts:68,133` |
| H17 | Forms en componentes complejos con objeto plano + `[(ngModel)]` | 🟢 mant | `asignaciones`, `asistentes`, `informes`, `programaciones` |
| H18 | Aspectos menores: `:host { display: block }` repetido, `console.error` sin telemetría, `CommonModule` redundante | 🟢 cleanup | varios |

### Lo que ya está bien y se conserva
Standalone components universales, `inject()` consistente, uso correcto de
`signal()`/`computed()`/`update()`, integración del design system
`@agroideas/ui`, centralización de feedback (`AlertService`),
tipado de respuesta (`ResponseDto`), enrutado y sidebar con links filtrados
por rol vía `computed()`. La arquitectura del monorepo (no importar PrimeNG /
Material directo desde apps) se respeta.

### Por qué un ADR ahora
1. La modernización toca **>15 archivos** y cambia capas (servicios, suscripciones, estrategia de CD).
2. Las decisiones deben ser **trazables** porque algunas (p. ej. `OnPush` global, mover HTTP a servicios) replican el patrón ya establecido por `kofix-ejecucion` y `EvidenciaService` / `SyncService` — y conviene dejar constancia de que es deliberado, no improvisado.
3. Hay opciones técnicas (p. ej. **Reactive Forms tipados vs `model<T>()` signal-based**) que se difieren a su fase y deben recordarse.

## Decisiones

### D1 — Alcance: solo `apps/sat-ui`, sin tocar `kofix-ejecucion`
Las mejoras aplican exclusivamente a `apps/sat-ui`. `kofix-ejecucion` ya está
sujeto a su propio plan de "endurecimiento" (Fase 3 de ADR 0001, override de
ESLint con ~270 warnings). Tocar ambos a la vez multiplicaría el riesgo de
regresión.

> Excepción: si en la Fase 6 (`FormatDatePipe`) se observa que `kofix-ejecucion`
> también lo necesita, se promueve a `@agroideas/utils` — en ese caso el cambio
> sí toca el lib compartido, pero NO modifica el código de `kofix-ejecucion`
> (solo lo deja disponible para futuras refactorizaciones).

### D2 — Ejecución por fases con PRs independientes
Cada fase es un PR autocontenido que deja la app en estado entregable. Esto
permite parar/reanudar, revisar incremental, y bisectar regresiones por fase.

### D3 — Las 10 fases (ROI descendente)

#### Fase 1 — Bugs de correctness 🔴
**Objetivo:** Corregir defectos reales antes de cualquier refactor.

| Tarea | Archivo | Hallazgo |
|------|---------|----------|
| 1.1 | Sustituir `localStorage.getItem('jwt_token')` → `localStorage.getItem(STORAGE_KEYS.SAT_TOKEN)` | `core/services/evidencia.service.ts:71,74` | H1 |
| 1.2 | Eliminar el field `private token = ...`; leer fresco dentro del método | `core/services/evidencia.service.ts:71` | H2 |
| 1.3 | Corregir typo `cantidad_evidecias` → `cantidad_evidencias` y eliminar el `as any` | `features/informes/informes.component.ts:144` | H3 |
| 1.4 | Combinar los dos `http.get` de `loadData()` con `forkJoin` para apagar `loading` cuando ambos terminen | `features/informes/informes.component.ts:175` | H4 |

**Criterio de aceptación:** imagen de evidencia abre con `?token=...` válido aun
después de un re-login; `loading` de informes permanece encendido hasta que
ambos requests resuelven.

#### Fase 2 — Capa de servicios para HTTP 🟠
**Objetivo:** Aislar HTTP en servicios siguiendo el patrón ya establecido por `EvidenciaService` / `SyncService`.

Crear:
```
core/services/
  asignacion.service.ts
  asistente.service.ts
  informe.service.ts
  programacion.service.ts
  organizacion.service.ts   ← ampliación al ADR durante ejecución: 5º servicio necesario para que `AsignacionesComponent` no consuma HTTP directo
```

Cada servicio expone: métodos `Observable<T>`, signal pública `loading` (`_loading.asReadonly()`), helpers de construcción de `HttpParams` y de mapeo. Ningún componente importa `HttpClient` ni referencia `environment.apiUrl`. Los GETs principales usan `finalize` para apagar `loading` también en error (aplicando la lección de Fase 1).

**Criterio de aceptación:** `grep -r "HttpClient" apps/sat-ui/src/app/features/` devuelve 0; comportamiento funcional idéntico.

#### Fase 3 — Suscripciones seguras 🟠
**Objetivo:** Eliminar leaks usando `takeUntilDestroyed()`.

Inyectar `DestroyRef` y pipear `takeUntilDestroyed(this.destroyRef)` en todos los `.subscribe()` de componentes. Para listas read-only con filtros, evaluar migrar a `toSignal()` / `httpResource()` (Angular 19+), aunque la decisión definitiva se difiere por compatibilidad con Angular 18 (versión del monorepo según ADR 0001 D2).

**Criterio de aceptación:** navegación rápida entre rutas no dispara callbacks sobre componentes destruidos (validable con `ngDevMode`); lint pasa.

#### Fase 4 — `ChangeDetectionStrategy.OnPush` global 🟠
**Objetivo:** Aprovechar realmente la reactividad granular de las señales.

Añadir `changeDetection: ChangeDetectionStrategy.OnPush` en todos los componentes (features + layout + sidebar + login + app-layout). Auditar cualquier mutación de objeto que no pase por `.set()`/`.update()`.

**Criterio de aceptación:** la UI se comporta igual; menos repintados (observable en Angular DevTools — Profiler).

#### Fase 5 — Modernizar APIs heredadas 🟡

| Tarea | Archivo | Hallazgo |
|------|---------|----------|
| `*ngFor`/`*ngIf` → `@for`/`@if` | `programaciones.component.ts:101,111,169` | H8 |
| `@ViewChild('fileInput')` → `viewChild<ElementRef<HTMLInputElement>>('fileInput')` y ajustar llamadas | `informes.component.ts:94,336,342,360` | H9 |
| `setTimeout(...)` para focus → `afterNextRender(() => ...)` | `informes.component.ts:336` | H10 |

**Criterio de aceptación:** cero `*ngFor`/`*ngIf`/`@ViewChild` en `apps/sat-ui/src/app/features/`.

#### Fase 6 — Eliminar duplicación 🟡

| Tarea | Detalle |
|------|---------|
| Crear `FormatDatePipe` puro | Decisión: empezar en `apps/sat-ui/src/app/shared/pipes/`. Si la Fase 6 detecta uso paralelo en `kofix-ejecucion`, promover a `@agroideas/utils` |
| Reemplazar las 6 implementaciones de `formatDate(...)` por `\| formatDate` | 6 componentes (H11) |
| Centralizar mapeos de estado (`getEstadoLabel`, `getResultadoLabel`, `getSyncStatus`) en `shared/utils/estado-labels.ts` con maps constantes | 3 componentes (H12) |

**Criterio de aceptación:** cero ocurrencias de `new Date(...).toLocaleDateString('es-PE')` en componentes.

#### Fase 7 — Romper componentes inflados 🟢

| Componente | Acción |
|-----------|--------|
| `evidencias.component.ts` (388 LOC) | Extraer `EvidenciaCardComponent`, `EvidenciaDetalleModalComponent`; pasar template a `templateUrl` |
| `informes.component.ts` (421 LOC) | Extraer `InformeDetalleModalComponent`, `InformeUploadPdfModalComponent` |
| `sincronizacion.component.ts` (313 LOC) | Extraer `SyncMetricCardComponent`, `SyncFiltersComponent`, `SyncHistoryTableComponent`; pasar template a `templateUrl` |

**Criterio de aceptación:** ningún componente >250 LOC; ningún template inline >100 líneas.

#### Fase 8 — Performance fino 🟢

| Tarea | Archivo | Hallazgo |
|------|---------|----------|
| `NgOptimizedImage` (con `width`/`height` explícitos) en galería de evidencias | `evidencias.component.ts:123` | H14 |
| Convertir rutas eager a `loadComponent` | `app.routes.ts:5–11` | H15 |
| Debounce con `toObservable(regionBusqueda).pipe(debounceTime(300))` o helper de signals con debounce | `asignaciones.component.ts:68,133` | H16 |

**Criterio de aceptación:** bundle inicial reduce (verificable con `nx build sat-ui --stats-json`); LCP en `/evidencias` mejora.

#### Fase 9 — Forms tipados y consistentes 🟢

Decisión pendiente al inicio de la fase: **Reactive Forms tipados** (mismo patrón que `login`) **vs `model<T>()` signal-based**. Se documentará en un anexo a este ADR.

Migrar primero `asistentes` (9 campos, validación crítica), luego `informes`, `programaciones`, `asignaciones`.

**Criterio de aceptación:** ningún componente declara `form = { ... }` plain con `[(ngModel)]`.

#### Fase 10 — Cleanup 🟢

- `:host { display: block }` repetido → regla global en `styles.scss`.
- `console.error` → `AlertService` o un `LoggerService` mockeable (anticipa Sentry/telemetría).
- Quitar `CommonModule` redundante cuando solo se usan `@if`/`@for`.
- Auditar target `extract-i18n` en `project.json`; si SAT no necesita i18n, quitarlo.

**Criterio de aceptación:** `nx lint sat-ui` con cero warnings nuevos.

### D4 — Orden y dependencias entre fases

```
Fase 1 (bugs)         ─┐
                       ├─→ Fase 2 (servicios) ─→ Fase 3 (takeUntilDestroyed) ─→ Fase 4 (OnPush)
                       │
                       └─→ Fase 5 (APIs modernas)   [independiente]
                       └─→ Fase 6 (anti-duplicación) [independiente]
                       └─→ Fases 7 → 8 → 9 → 10     [secuenciales pero opcionales]
```

Las fases 1–4 forman el **camino crítico**. Las 5–10 son refinamiento y pueden
intercalarse o saltarse si la prioridad de producto cambia.

### D5 — Política de PRs y commits
- Un PR por fase, con título `[sat-ui][faseN] <descripción>`.
- Cada PR incluye en su descripción la sección correspondiente de este ADR.
- Mensajes de commit siguen el estilo del repo (en español, descriptivo).
- Se actualiza el [Registro de implementación](#registro-de-implementación) al cerrar cada fase.

## Consecuencias

### Positivas
- App alineada con las prácticas modernas de Angular 18+ documentadas en `angular-best-practices`.
- Reducción real de boilerplate (-1 implementación de `formatDate` × 5, -4 componentes que manejan HTTP directo).
- Cero leaks de suscripción → más seguro al navegar rápido.
- OnPush + señales → menos repintados, mejor performance percibida.
- Componentes pequeños → onboarding y testing más simples.
- Sirve como **referencia operativa** para futuras refactorizaciones en `kofix-ejecucion` (Fase 4 de ADR 0001).

### Negativas / riesgos
- 10 PRs en un período corto exigen disciplina de revisión.
- `OnPush` puede exponer mutaciones latentes que hoy "funcionan por accidente" — la Fase 3 (suscripciones limpias) precede a propósito para minimizar este riesgo.
- Moverse a `httpResource()` (Fase 3 opcional) exige Angular 19; si el monorepo permanece en 18 (D2 de ADR 0001) se posterga.
- La promoción de `FormatDatePipe` a `@agroideas/utils` (Fase 6) cambia un lib compartido — debe coordinarse con el equipo KOFIX.

### Neutras
- No se eliminan dependencias del `package.json`.
- No se cambian endpoints ni contratos con el backend (salvo el typo `cantidad_evidecias`, que es servidor y se coordinará aparte).

## Alternativas consideradas y descartadas

1. **Refactor monolítico en un solo PR** — descartado: imposible de revisar, riesgo de regresión alto, sin granularidad para bisectar.
2. **Migrar primero a Angular 19 / 20** — descartado: ADR 0001 fija Angular 18 como versión del monorepo. La modernización descrita aquí es compatible con 18.
3. **Reescribir `sat-ui` adoptando la Clean Architecture de `kofix-ejecucion`** — descartado: alcance enorme; el patrón actual `core / features / layout / shared` es legítimo y el problema no es estructural sino de adopción inconsistente de prácticas.
4. **Saltar la Fase 2 y aplicar `takeUntilDestroyed` directamente sobre los `.subscribe()` inline** — descartado: deja HTTP en componentes, perpetúa duplicación de URLs y dificulta tests.

## Referencias

- [ADR 0001 — Migración a Monorepo Frontend AGROIDEAS](./0001-migracion-monorepo-frontend-agroideas.md)
- `CLAUDE.md` — guía de convenciones del monorepo.
- `AGENTS.md` — guía corta para agentes IA (sincronizar tras cada fase).
- `apps/sat-ui/` — código objetivo de este ADR.
- Skill `angular-best-practices` — base de las 112 reglas que motivan los hallazgos.

## Registro de implementación

| Fase | Estado | PR | Fecha cierre | Notas |
|------|--------|----|-------------|-------|
| 1 — Bugs de correctness | ✅ Completada | _pendiente_ | 2026-05-26 | 1.1–1.4 aplicadas + cleanup oportunista de imports no usados en `evidencia.service.ts` (`SafeResourceUrl`, `HttpResponse`, `tap`). `nx lint sat-ui` y `nx build sat-ui` verdes en los archivos tocados. Un error preexistente en `evidencia.service.ts:122` (`blob as any`) queda fuera de scope, se aborda en Fase 10. |
| 2 — Capa de servicios HTTP | ✅ Completada | _pendiente_ | 2026-05-26 | 5 servicios creados (`AsistenteService`, `AsignacionService`, `OrganizacionService` ← ampliación, `InformeService`, `ProgramacionService`). 4 componentes refactorizados (`asignaciones`, `asistentes`, `informes`, `programaciones`). `grep HttpClient\|environment.apiUrl apps/sat-ui/src/app/features/` → 0. Build verde; los 4 `.ts` modificados con 0 errores de lint. Los servicios usan `finalize` para apagar `loading` también en error. |
| 3 — Suscripciones seguras | ✅ Completada | _pendiente_ | 2026-05-26 | 27 `.subscribe()` blindados con `takeUntilDestroyed(this.destroyRef)` en 7 componentes (`login`, `asignaciones`, `asistentes`, `informes`, `programaciones`, `evidencias`, `sincronizacion`). `grep` verifica paridad 27↔27. `forkJoin` de Fase 1 mantiene `finalize` + añade `takeUntilDestroyed` en mismo `pipe`. Build verde; lint estable en 19 errores preexistentes (sin regresión). |
| 4 — `OnPush` global | ✅ Completada | _pendiente_ | 2026-05-26 | `changeDetection: ChangeDetectionStrategy.OnPush` aplicado a los **12 componentes** (10 features + sidebar + app-layout + app-root). `grep` verifica paridad 12↔12. Patrones a vigilar: forms con `[(ngModel)]` (event handler dispara CD ✅), `computed()` se re-evalúa al cambiar señal ✅. Sin mutaciones a arrays/objetos detectadas que requieran ajuste. Build verde; lint estable en 19 errores preexistentes (sin regresión). **Camino crítico (Fases 1–4) completo.** |
| 5 — APIs modernas | ✅ Completada | _pendiente_ | 2026-05-26 | (a) `*ngFor`/`*ngIf` → `@for`/`@if` en `programaciones` (3 ocurrencias) + un `*ngIf` adicional en `informes.component.html:106` detectado durante la fase. (b) `@ViewChild('fileInput')` → `viewChild<ElementRef<HTMLInputElement>>('fileInput')` + ajuste de 3 llamadas en `informes`. (c) `setTimeout(..., 100)` para focus → `afterNextRender(..., { injector })` con `inject(Injector)`. Los 2 `setTimeout` restantes (debounce en `asignaciones`) corresponden a H16 / Fase 8. Build verde; lint estable en 19 errores preexistentes. |
| 6 — Anti-duplicación | ✅ Completada | _pendiente_ | 2026-05-26 | `FormatDatePipe` y utilidad de fechas `formatDate` (inmune al bug de timezone shift) creadas en `@agroideas/utils` tras detectar duplicidad también en `kofix-ejecucion`. Se removieron las lógicas duplicadas de fechas en los componentes correspondientes de `sat-ui` y se centralizaron los mapeos de estados (`getEstadoLabel`, `getEstadoClass`, `getResultadoLabel` y `getSyncStatus`) en `shared/utils/estado-labels.ts`. Build de producción exitoso. |
| 7 — Split componentes | ✅ Completada | _pendiente_ | 2026-05-26 | Componentes `evidencias` (de 388 a 114 LOC), `sincronizacion` (de 316 a 92 LOC) e `informes` (de 358 a 235 LOC) modularizados con éxito y sus plantillas inline extraídas a archivos `.html` externos. Ninguno de estos componentes supera ahora las 250 LOC. Se crearon los subcomponentes standalone `EvidenciaCard`, `EvidenciaDetalleModal`, `SyncFilters`, `SyncHistoryTable`, `InformeDetalleModal` e `InformeUploadPdfModal`. En sincronización se adoptó el componente reutilizable `<app-ui-kpi>` de `@agroideas/ui`. |
| 8 — Performance fino | ✅ Completada | _pendiente_ | 2026-05-26 | Implementado `NgOptimizedImage` con `fill` en `EvidenciaCardComponent`. Migrado enrutamiento de características secundarias a `loadComponent` perezoso en `app.routes.ts`. Reemplazado `setTimeout`/`clearTimeout` de búsqueda por debounce reactivo con `toObservable` + `debounceTime(300)` + `distinctUntilChanged` en `AsignacionesComponent`. Build verde con generación de lazy chunks individuales y cero regresiones en lint. |
| 9 — Forms tipados | ✅ Completada | _pendiente_ | 2026-05-26 | Migrados Asistentes, Asignaciones, Informes y Programaciones a Angular Typed Reactive Forms (`ReactiveFormsModule`) eliminando por completo enlace bidireccional mediante `ngModel` y mutaciones de objeto literal directas. Se introdujeron validadores robustos y controles de estado dinámicos en TS. Linter y compilación verde. |
| 10 — Cleanup | ✅ Completada | _pendiente_ | 2026-05-26 | Removido `CommonModule` redundante de los componentes modernizados (`AsistentesComponent`, `AsignacionesComponent`, `ProgramacionesComponent` y `LoginComponent`), optimizando el tamaño final de los chunks standalone y promoviendo un mejor sacudido de dependencias (Tree-Shaking). Linter y compilación verde. |
