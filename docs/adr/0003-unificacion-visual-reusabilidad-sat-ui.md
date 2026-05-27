# ADR 0003: Unificación Visual y Reutilización de Componentes en `apps/sat-ui`

## Estado
Aceptado · **Finalizado** (Fase 1 ✅ · Fase 2 ✅ · Fase 3 ✅ — ver [Registro de implementación](#registro-de-implementación))

## Fecha
2026-05-26

## Responsables
Equipo Frontend AGROIDEAS · Owner del módulo: Oscar Pazos

## Aplica a
`apps/sat-ui` (Banco de Evidencias, Consola de Sincronización y componentes relacionados).

## Contexto

Tras la exitosa finalización de las fases del [ADR 0002](./0002-modernizacion-sat-ui-buenas-practicas-angular.md), la aplicación `sat-ui` ha mejorado significativamente en su estructura de código, rendimiento de carga diferida (lazy loading), control de fugas de memoria y reactividad mediante señales y formularios reactivos tipados.

Sin embargo, una auditoría profunda de la UI/UX revela la existencia de deuda técnica visual y de reutilización de componentes en dos pantallas clave:
1. **Banco de Evidencias (`evidencias`):**
   * Se utilizan botones HTML nativos estilizados de forma manual.
   * Se introducen clases de color ad-hoc como `bg-indigo-600` e `indigo-700` que **rompen la coherencia visual** con la paleta institucional MIDAGRI/INIA (verde `#346b00` y ámbar `#fab50b`) definida en `@agroideas/theme`.
   * Se implementó un paginador manual hecho a mano con botones nativos en lugar de utilizar controles uniformes.
2. **Consola de Sincronización (`sincronizacion`):**
   * El subcomponente `SyncHistoryTableComponent` maquetó una tabla nativa (`<table>`) desde cero en lugar de reutilizar el componente unificado `<app-ui-data-table>` de `@agroideas/ui`, lo cual duplica lógica y rompe la consistencia de visualización y UX de las grillas.
   * Implementa su propio paginador manual duplicado.

### Por qué un ADR ahora
Es necesario establecer formalmente que la maquetación manual de controles estándar (tablas, botones, paginadores) y el uso de colores ajenos a la marca en `sat-ui` son antipatrones que deben ser saneados. Este ADR define la estrategia para unificar y refactorizar estas vistas bajo el ecosistema compartido de `@agroideas/ui` y `@agroideas/theme`.

---

## Decisiones

### D1 — Migración Obligatoria a Componentes Compartidos
* Toda tabla de datos que deba ser visualizada en `sat-ui` (incluyendo logs e históricos) debe ser renderizada exclusivamente mediante el componente `<app-ui-data-table>` de `@agroideas/ui`.
* Todo botón de acción debe ser renderizado mediante `<ui-button>`. Queda prohibido el uso de botones HTML `<button>` nativos con clases de color o interacción ad-hoc a menos que sea un comportamiento altamente especializado no cubierto por la librería.

### D2 — Prohibición de Paletas Cromáticas Ajenas a la Marca (Cero Índigo)
* Se eliminarán por completo las clases `bg-indigo-*`, `hover:bg-indigo-*` e `indigo-*` en los archivos de vistas de la aplicación.
* Todas las llamadas de color e interactividad visual deben ceñirse estrictamente al preset de Tailwind `@agroideas/theme` utilizando las clases semánticas de marca: `bg-primary`, `bg-secondary`, `bg-accent`, `text-on-surface`, etc.

### D3 — Unificación de Paginadores
* Ningún componente de vista declarará botones manuales para paginación ("Anterior" y "Siguiente") si los datos se muestran en formato tabular. Se delegará la responsabilidad de la paginación al paginador interno de `<app-ui-data-table>`.
* Para flujos no tabulares (como la galería de evidencias), se utilizará el componente `<ui-button>` con el estilo `appearance="soft"` y `severity="secondary"` para renderizar los controles de avance de página, garantizando tipografía y radios unificados.

---

## Fases de Implementación

### 📸 Fase 1 — Saneamiento Visual del Banco de Evidencias (UI/UX)
* **Objetivo:** Traer consistencia de marca y componentes a la galería.
* **Acciones:**
  * Reemplazar botones de "Actualizar" y "Limpiar" con `<ui-button>`, aplicando severidad `primary` (para actualizar) y `secondary` con `appearance="soft"` (para limpiar).
  * Sustituir los botones nativos de paginación por instancias de `<ui-button>` adaptados.
  * Eliminar la paleta de color `indigo` ad-hoc.
* **Criterio de aceptación:** El banco de evidencias se ve 100% integrado a los colores verde/ámbar de la marca y sus botones e interactividad son consistentes con el resto de la app.

### 🔄 Fase 2 — Refactorización de Sincronización Móvil a `UiDataTableComponent`
* **Objetivo:** Eliminar la duplicación de código de tablas y paginadores manuales.
* **Acciones:**
  * Refactorizar `SyncHistoryTableComponent` eliminando la maquetación nativa de `<table>`.
  * Integrar `<app-ui-data-table>` utilizando la propiedad `rowTemplate` para renderizar de manera robusta las columnas personalizadas (como los logs de sincronización de ratios de actividades y botones de estado).
  * Delegar la paginación al comportamiento nativo de `<app-ui-data-table>`.
* **Criterio de aceptación:** La consola de sincronización muestra el historial utilizando la misma grilla unificada que los asistentes y programaciones, eliminando código duplicado.

### 🧪 Fase 3 — Saneamiento Final y Auditoría
* **Objetivo:** Garantizar la ausencia de regresiones visuales y de código.
* **Acciones:**
  * Ejecutar búsquedas en el workspace para certificar que no quedan referencias de color extrañas (`bg-indigo`, `text-indigo`).
  * Ejecutar los linters y builds de producción globales.
* **Criterio de aceptación:** Compilación de producción exitosa y cero advertencias de accesibilidad o estructura nuevas.

---

## Consecuencias

### Positivas
* **Consistencia UX/UI Total:** El usuario experimenta una única línea de diseño unificada (verde institucional MIDAGRI/INIA y fuentes unificadas).
* **Menos Deuda Técnica:** Eliminación de código redundante de tablas y paginadores hechos a mano en `sat-ui`.
* **Facilidad de Extensibilidad:** Cualquier mejora agregada a la grilla unificada (ej. ordenamiento dinámico o accesibilidad) se propaga automáticamente a la consola de sincronización.

### Negativas / Riesgos
* Requiere re-adaptar la lógica de envío de eventos de paginación en Sincronización para que responda a los outputs nativos del data-table. Sin embargo, el impacto es menor y manejable dentro de la arquitectura actual.

---

## Registro de implementación

| Fase | Estado | PR | Fecha cierre | Notas |
|------|--------|----|-------------|-------|
| 1 — Saneamiento de Evidencias | ✅ Completado | — | 2026-05-26 | Migración completa a ui-button y erradicación de indigo. |
| 2 — Migración de Sincronización | ✅ Completado | — | 2026-05-26 | Migración de tabla nativa a UiDataTableComponent y unificación de botones/paginadores. |
| 3 — Saneamiento Final | ✅ Completado | — | 2026-05-26 | Verificación cromática y validación de compilación/lints limpia. |
