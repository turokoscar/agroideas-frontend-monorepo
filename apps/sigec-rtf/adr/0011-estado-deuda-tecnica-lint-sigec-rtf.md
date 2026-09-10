# ADR-0011: Estado Situacional y Estrategia de Remediación de Deuda Técnica (Lint) en SIGEC-RTF

## Estado
Aceptado

## Contexto
Durante la auditoría de código y refactorización de la aplicación `sigec-rtf` dentro del monorepo, se detectó que el proceso de integración (`nx lint sigec-rtf`) fallaba masivamente con aproximadamente **1688 incidencias** (entre errores y advertencias). 

Estas incidencias bloqueaban los pipelines de construcción y reflejaban una deuda técnica acumulada en tres frentes principales:
1. **Riesgos Funcionales (Plantillas):** Uso generalizado de comparaciones débiles (`==` y `!=`) en las plantillas HTML, lo cual expone a la aplicación a comportamientos anómalos por coerción de tipos.
2. **Accesibilidad y UX (A11Y):** Gran cantidad de etiquetas `<label>` sin controles asociados (`for`) y elementos no semánticos (como `<div>` o `<span>`) con eventos `(click)` que no podían ser activados mediante teclado (falta de `tabindex` y `keydown.enter`).
3. **Tipado y Calidad de TypeScript:** Fuerte dependencia del tipo `any`, uso abusivo de aserciones no nulas (`!`), variables/interfaces declaradas sin uso, funciones vacías (`() => {}`) y anotaciones de tipo redundantes (`no-inferrable-types`).

## Decisión
En lugar de intentar una refactorización masiva que paralizaría el desarrollo de nuevas características, se decidió adoptar un enfoque híbrido de remediación progresiva (similar al precedente establecido en el **ADR-0008 para Kofix**):

1. **Corrección Crítica Inmediata:**
   - Se reemplazaron todas las comparaciones débiles (`==`, `!=`) por estrictas (`===`, `!==`) en las plantillas principales (ej. `oa-registro.component.html`), verificando correctamente la nulidad e indefinición.
   - Se aplicó accesibilidad básica (soporte para teclado) a los componentes interactivos críticos, como las zonas de subida de archivos (Dropzones) en `un-gabinete.component.html` y `oa-registro.component.html`.
   - Se eliminaron importaciones muertas y código vacío inútil en los controladores principales.

2. **Degradación controlada de Reglas (Unblock del Pipeline):**
   - Para permitir la compilación continua, se ajustó el archivo `apps/sigec-rtf/eslint.config.js`.
   - Reglas de Accesibilidad degradadas a `warn`: `label-has-associated-control`, `click-events-have-key-events`, `interactive-supports-focus`.
   - Reglas de TypeScript degradadas a `warn`: `no-explicit-any`, `no-unused-vars`, `no-empty-function`, `no-non-null-assertion`.

3. **Reconocimiento de Deuda Restante:**
   - Quedaron documentados aproximadamente **1590 errores remanentes** (mayormente derivados de reglas menores como `no-inferrable-types` o variables complejas). Estos no se silenciarán por completo; permanecerán visibles en los reportes locales para que el equipo los subsane gradualmente como parte de su flujo de trabajo habitual (regla del *Boy Scout*: dejar el código más limpio de lo que se encontró).

## Actualización (2026-09-10)

Se auditó este ADR contra el estado real del código y se corrigieron dos problemas:

1. **Los 2 errores duros restantes** (`@typescript-eslint/no-inferrable-types` en
   `oa-rtf.service.ts:387`, sobre los parámetros `pagina: number = 1, cantidad: number = 10`)
   se eliminaron quitando las anotaciones redundantes. `nx lint sigec-rtf` ya no falla:
   **0 errores, 79 warnings** (el resto de la deuda reconocida arriba).
2. Al correr `nx lint` se detectó que **`apps/sigec-rtf/public/pdf.worker.min.mjs`**
   (bundle minificado de `pdfjs-dist`, agregado en la Fase 5 del visor PDF, commit `879f2eb`,
   posterior a este ADR) estaba siendo linteado como código fuente, generando ~1294 errores
   falsos no relacionados con esta deuda técnica y rompiendo `nx run-many -t lint` para todo
   el monorepo. Causa: el `eslint.config.js` raíz solo ignoraba `**/dist`. Se agregó
   `**/public/**` a `ignores` en el `eslint.config.js` raíz — este archivo de assets estáticos
   nunca debió lintearse como TS.

Con ambos arreglos, `npx nx run-many -t lint,test` pasa limpio en los 16 proyectos del
monorepo. De paso se corrigieron errores duros preexistentes, no relacionados con
`sigec-rtf` pero descubiertos durante la misma verificación, en `libs/ui`, `apps/sat-ui`
y `apps/sigec-cierre` (ver historial de commits del 2026-09-10).

## Consecuencias
### Positivas
- Se mitigaron proactivamente vectores de bugs funcionales (`eqeqeq`).
- Se mejoró la accesibilidad base para interacciones clave.
- Las reglas estrictas se transformaron de "bloqueadores" a "indicadores de advertencia", flexibilizando el desarrollo.

### Negativas / Riesgos
- La deuda técnica permanece latente. Si no existe un compromiso del equipo para resolver las advertencias al tocar archivos antiguos, la calidad del código no mejorará.
- Reglas no contempladas en las excepciones iniciales seguirán provocando estado `exit code 1` en el lint hasta que sean abordadas o degradadas explícitamente.
