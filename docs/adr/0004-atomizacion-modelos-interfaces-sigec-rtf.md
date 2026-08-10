# ADR 0004: Atomización de Modelos y DTOs en la Arquitectura Frontend (One File Per Type)

**Estado**: Aprobado  
**Fecha**: 2026-08-10  
**Contexto**: AGROIDEAS Monorepo - `apps/sigec-rtf`  
**Estándar de Referencia**: Resolución Ministerial N° -2022-MIDAGRI (MCVS-604)

---

## 1. CONTEXTO Y PROBLEMA

En el mantenimiento y evolución de la aplicación `sigec-rtf`, se identificó que las interfaces, DTOs y tipos del dominio RTF estaban concentrados en un solo archivo monolítico (`rtf.service.ts`), generando:
1. **Acoplamiento de tipos y lógica**: Múltiples responsabilidades dentro del servicio HTTP.
2. **Dificultad en la trazabilidad del control de versiones**: Modificaciones en tipos menores afectaban el historial de control de cambios del servicio principal.
3. **Falta de granularidad**: Imposibilidad de reutilizar o auditar interfaces de forma atómica.

---

## 2. DECISIÓN DE ARQUITECTURA

Adopción del principio **"One File Per Type / Model"** (Un archivo por modelo e interfaz), organizando todos los tipos del dominio RTF dentro de `src/app/core/models/` y re-exportándolos mediante un *Barrel Export* (`index.ts`).

### Estructura de Archivos Creada:

```text
apps/sigec-rtf/src/app/core/models/
├── api-response.model.ts              -> Definición envelope ResponseDto MIDAGRI
├── datos-paginados.model.ts           -> Estructura paginada genérica
├── paso-critico.model.ts              -> Modelo PasoCritico
├── disbursement.model.ts              -> Modelo Disbursement
├── meta-fisica.dto.ts                 -> DTO MetaFisicaDto
├── indicador.dto.ts                   -> DTO IndicadorDto
├── rtf-cabecera.dto.ts                -> DTO RtfCabeceraDto
├── evidence.dto.ts                    -> DTO EvidenceDto
├── gasto-f1.dto.ts                    -> DTO GastoF1Dto
├── actividad-reciente.model.ts        -> Modelo ActividadReciente
├── paso-critico-indicador.model.ts    -> Modelo PasoCriticoIndicador (ADR-003)
├── paso-critico-meta.model.ts         -> Modelo PasoCriticoMeta (ADR-002)
├── dashboard-data.model.ts            -> Modelo DashboardData
├── ur-completo.dto.ts                 -> DTO UrCompletoDto
├── ur-evaluacion-item.dto.ts          -> DTO UrEvaluacionItemDto
├── ur-evaluacion-request.dto.ts       -> DTO UrEvaluacionRequestDto
├── dashboard-un-convenio-item.dto.ts  -> DTO DashboardUnConvenioItemDto
├── dashboard-un-data.model.ts         -> DTO DashboardUnData
└── index.ts                           -> Barrel Export unificado
```

---

## 3. VENTAJAS Y CONSECUENCIAS

- ✅ **Mantenibilidad Atómica**: Cada cambio en una interfaz/DTO afecta exclusivamente a su archivo propio.
- ✅ **Reusabilidad Limpia**: Los servicios y componentes importan únicamente lo que necesitan o usan el *barrel export* sin acoplarse al servicio de HTTP.
- ✅ **Cumplimiento MIDAGRI (RM-2022-MIDAGRI)**: Nomenclatura `lowerCamelCase` con prefijos de columnas/atributos (`ide`, `can`, `txt`, `fec`, `num`, `est`, `flg`).
- ✅ **Cero Rompimiento**: El *barrel export* en `index.ts` previene quiebres en las importaciones existentes de la aplicación.
