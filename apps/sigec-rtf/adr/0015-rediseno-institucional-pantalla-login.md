# ADR-0015: Rediseño Institucional y Modernización de la Pantalla de Login en SIGEC-RTF

## Estado
Aceptado

## Fecha
2026-09-18

## Contexto
La pantalla de inicio de sesión de `sigec-rtf` (`/login`) presentaba una interfaz minimalista y genérica:
1. No disponía de la identidad visual oficial del Estado Peruano (MIDAGRI y Programa AGROIDEAS).
2. El selector de tipo de usuario (pestañas) no adaptaba de forma dinámica las ayudas contextuales, longitud ni placeholders de los campos de identidad.
3. No contaba con un control para alternar la visibilidad de la contraseña (mostrar/ocultar contraseña), dificultando el acceso a usuarios con contraseñas complejas.
4. Carecía de la advertencia regulatoria de acceso y auditoría requerida para sistemas de rendición de fondos públicos.
5. No existía cobertura de pruebas unitarias (`login.component.spec.ts`) para esta funcionalidad crítica de entrada.

Se elaboró y validó un prototipo institucional de alta fidelidad que moderniza la experiencia de usuario (UX) manteniendo estricta compatibilidad con el backend de autenticación `sel-api-seguridad` (:7101) y las directrices de diseño del monorepo.

## Decisión

1. **Estructura Bifurcada Responsiva (Hero Institucional + Módulo de Autenticación):**
   - **Columna Izquierda (Hero Institucional):** Sección con degradado verde profundo, patrones orgánicos SVG (`hero-pattern` y geometría circular), badge animado con pulso *"Plataforma Oficial RTF"*, emblema gráfico del agro nacional, descripción institucional del módulo RTF y pie informativo de canal cifrado con enlace a mesa de ayuda. En pantallas móviles (`< lg`), se oculta para priorizar el acceso rápido.
   - **Columna Derecha (Módulo de Acceso):** Cabecera oficial con logotipos de alta definición de MIDAGRI y AGROIDEAS utilizando los recursos locales en `apps/sigec-rtf/public/img/`, garantizando funcionamiento sin dependencias de servicios externos.

2. **Gestión Reactiva con Angular Signals:**
   - `selectedTab`: Controla el perfil de acceso (`'postulante' | 'personal'`).
   - `showPassword`: Signal booleano para alternar el tipo de input entre `password` y `text`.
   - `rememberMe`: Signal booleano para recordar el identificador de usuario/RUC en `localStorage` (bajo la clave `sigec_rtf_remembered_user`). Bajo ninguna circunstancia se almacena la contraseña.
   - `loading` y `errorMessage`: Manejo reactivo de estados de carga y retroalimentación de error.

3. **Adaptación Dinámica del Campo de Identidad:**
   - Para **Organización Agraria (`postulante`)**:
     - Label: `RUC de la Organización`
     - Placeholder: `Ej. 20605569481`
     - Maxlength: `11`
     - Helper: `Ingrese el número de RUC de 11 dígitos registrado en AGROIDEAS.`
     - Ícono: Edificio / Organización (`business`)
     - Validación en cliente: Requiere 11 dígitos numéricos antes del envío.
   - Para **Personal AGROIDEAS (`personal`)**:
     - Label: `DNI o Correo Institucional`
     - Placeholder: `usuario@agroideas.gob.pe o DNI`
     - Maxlength: `40`
     - Helper: `Acceso exclusivo para evaluadores de la Unidad de Negocios y sede central.`
     - Ícono: Persona / Credencial (`person`)

4. **Alineación con el Design System `@agroideas/theme` y ESLint:**
   - Eliminación de colores hex arbitrarios; uso de tokens HSL compartidos (`primary`, `surface`, `foreground`, `border`, `emerald`).
   - Cumplimiento estricto de accesibilidad: asociación de `<label for="...">` con `<input id="...">`, atributos `role="tab"` y `aria-selected` en el selector de perfil, y `aria-label` en el botón de alternar visibilidad de contraseña.

5. **Pruebas Unitarias Integrales:**
   - Creación de `apps/sigec-rtf/src/app/features/login/login.component.spec.ts` con cobertura para renderizado, cambio de pestañas, validaciones, toggle de visibilidad, persistencia de `rememberMe`, manejo de errores de API y redirección por rol (`POSTULANTE`, `ADMIN`, `UN`).

## Consecuencias

### Positivas
- Experiencia de usuario profesional, alineada a las directrices de Gobierno Digital y fortaleciendo la confianza institucional.
- Reducción sustancial de errores de inicio de sesión y llamadas a soporte técnico.
- Mayor mantenibilidad y cobertura de pruebas dentro del monorepo.
