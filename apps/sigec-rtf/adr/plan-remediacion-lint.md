# Plan de Remediación de Lint: SIGEC-RTF

Este plan establece una estrategia por fases para solucionar de forma segura y progresiva las incidencias de linting (errores y advertencias) detectadas en la aplicación `sigec-rtf`. Se prioriza mitigar riesgos funcionales y cumplir normativas de usabilidad, dejando las mejoras de mantenimiento para el final.

---

## Fase 1: Prevención de Bugs Subyacentes (Alta Prioridad)
*Enfocada en corregir lógicas de renderizado que pueden causar comportamientos impredecibles por coerción de tipos.*

- **Regla:** `@angular-eslint/template/eqeqeq`
- **Incidencias comunes:** Uso de `==` y `!=` en directivas `*ngIf`, `[class.active]`, etc.
- **Acción:** Reemplazar por comparaciones estrictas (`===` y `!==`) en todas las plantillas HTML (ej. `oa-registro.component.html`).
- **Riesgo:** Bajo. Si la lógica original dependía de la coerción de tipos (ej. comparar `'1' == 1`), podría requerirse un casteo explícito.

## Fase 2: Accesibilidad Web y UX (A11Y) (Media-Alta Prioridad)
*Enfocada en estandarizar la accesibilidad (basado en el precedente ADR-0008 para Kofix). Hacer la app navegable por teclado y lectores de pantalla.*

- **Reglas:** 
  - `@angular-eslint/template/label-has-associated-control`
  - `@angular-eslint/template/click-events-have-key-events`
  - `@angular-eslint/template/interactive-supports-focus`
- **Incidencias comunes:** 
  - Etiquetas `<label>` sueltas sin un atributo `for` o sin envolver un input.
  - Elementos no semánticos (`<div>`, `<span>`, `<i>`) con eventos `(click)` que no pueden ser activados con teclado.
- **Acción:** 
  - Asociar correctamente los `label` con su `input` usando `id` / `for`.
  - Agregar `tabindex="0"` y eventos `(keydown.enter)` a elementos interactivos personalizados, o bien refactorizarlos a etiquetas `<button type="button">`.

## Fase 3: Limpieza de Código Muerto (Media Prioridad)
*Enfocada en reducir ruido, facilitar el mantenimiento y reducir marginalmente el tamaño del código base.*

- **Reglas:** 
  - `@typescript-eslint/no-unused-vars`
  - `@typescript-eslint/no-empty-function`
- **Incidencias comunes:** Variables de interfaz definidas pero no usadas (`MetaFisicaDto`, `IndicadorDto`), inyecciones de dependencias sin uso, o callbacks de suscripción vacíos.
- **Acción:** 
  - Eliminar referencias a variables e importaciones no utilizadas.
  - Eliminar funciones vacías (o documentar con comentarios en caso de que sean intencionalmente vacías, ej. un `catchError` que ignora el error).

## Fase 4: Refactorización a Tipado Estricto (Baja Prioridad / Largo Plazo)
*Esta es la fase más costosa porque requiere comprender a profundidad los modelos de negocio y respuestas del backend.*

- **Reglas:** 
  - `@typescript-eslint/no-explicit-any`
  - `@typescript-eslint/no-non-null-assertion` (advertencias)
- **Incidencias comunes:** Casteos a `any` en repuestas HTTP, diccionarios genéricos y formularios (`FormBuilder`). Uso excesivo del operador `!`.
- **Acción:** 
  - Reemplazar progresivamente `any` por las interfaces correspondientes de `domain/models` o `unknown`.
  - Refactorizar las aserciones no nulas (`!`) usando encadenamiento opcional (`?.`) o validaciones previas de nulidad (`if (x != null)`).
