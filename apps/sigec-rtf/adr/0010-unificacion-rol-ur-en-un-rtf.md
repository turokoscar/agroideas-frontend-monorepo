# ADR-010: Unificación de Verificación de Campo (UR) dentro de las funciones de la Unidad de Negocios (UN) en SIGEC-RTF

## Estado
Aceptado

## Contexto
Durante el desarrollo del módulo de Rendición Técnica y Financiera (RTF) en la aplicación `sigec-rtf`, se analizó el flujo de revisión de expedientes. En los procesos regulares de la institución, suele existir una distinción teórica entre el personal que realiza la evaluación en gabinete (Unidad de Negocios - UN) y el personal que realiza la verificación de campo (Unidad Regional - UR). 

Sin embargo, para el alcance del sistema actual y tras revisar las funcionalidades esperadas, se determinó que la responsabilidad operativa recae sobre el mismo especialista asignado al expediente. Crear perfiles y roles de sistema separados para "UN" y "UR" agregaría fricción al flujo del usuario (el mismo especialista tendría que cerrar sesión o cambiar de rol para completar el Anexo 19 de verificación de campo).

## Decisión
Se decidió **no implementar un actor o rol "UR" (Unidad Regional) separado** en el flujo del sistema para la aplicación `sigec-rtf`. 

La verificación de campo (por ejemplo, el Anexo 19) se integrará como una sección o paso adicional dentro de la misma pantalla de evaluación (`UnGabineteComponent` y el dashboard `UnDashboardComponent`), accesible de manera unificada para el rol `UN` (Unidad de Negocios / Unidad de Monitoreo).

## Consecuencias
### Positivas
- **Simplificación del flujo de usuario:** El especialista puede realizar la evaluación de gabinete y registrar la verificación de campo desde la misma bandeja, sin fricciones.
- **Reducción de complejidad técnica:** Menos roles que mapear en `AuthService` (`mapearRolSigecRtf`) y menos guards o rutas anidadas en `app.routes.ts`.
- **Menor carga cognitiva:** El código es más directo al consolidar los permisos relacionados con la evaluación interna en un único rol dominante (`UN`).

### Negativas / Riesgos
- Si en el futuro normativo se exige que la Verificación de Campo y la Evaluación en Gabinete sean realizadas estrictamente por usuarios distintos (Segregación de funciones), se deberá refactorizar el enrutamiento y los permisos para reintroducir el rol `UR`. 
- Discrepancia temporal entre la nomenclatura de algunos documentos de negocio ("Fase UR") y el modelo de roles del sistema.

## Notas Adicionales
Esta decisión se encuentra reflejada en:
- `apps/sigec-rtf/src/app/core/services/auth.service.ts`: En el mapeo estricto de los roles provenientes de `sel-api-seguridad`.
- `apps/sigec-rtf/src/app/app.routes.ts`: En los `roleGuard` que unifican el acceso a las rutas `/rtf/evaluacion-gabinete` y `/rtf/dashboard-un` bajo el conjunto de permisos de `UN`, `DE`, `UAJ`, y `USE`.
