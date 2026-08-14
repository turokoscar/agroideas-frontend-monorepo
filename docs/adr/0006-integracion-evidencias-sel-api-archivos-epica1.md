# ADR 0006: Integración de Evidencias con Microservicio sel-api-archivos y Consistencia Cruzada en Épica 1

**Estado**: Aprobado  
**Fecha**: 2026-08-10  
**Contexto**: AGROIDEAS Monorepo - `apps/sigec-rtf` & API Backend `SIGEC_RTF.Api`  
**Referencia**: RM N° -2022-MIDAGRI (MCVS-604) & `sel-api-archivos`

---

## 1. CONTEXTO Y PROBLEMA

En el flujo de la Épica 1 (Llenado Digital, Validación y Envío del RTF por la Organización Agraria), los usuarios adjuntan evidencias en PDF para respaldar metas físicas, indicadores y gastos. Anteriormente, la gestión de archivos se realizaba mediante almacenamiento local heterogéneo en el backend de RTF, lo cual:
1. Generaba acoplamiento de infraestructura de archivos dentro del dominio RTF.
2. No aprovechaba el microservicio centralizado de almacenamiento de la institución (`sel-api-archivos`).
3. Carecía de un motor estricto de validación cruzada antes de formalizar el envío del reporte.

---

## 2. DECISIÓN DE ARQUITECTURA

1. **Desacoplamiento e Interoperabilidad con `sel-api-archivos`**:
   - Delegar la persistencia física, checksum SHA256 y metadatos de los archivos al microservicio centralizado `sel-api-archivos`.
   - Enviar las peticiones de subida (`POST /archivos`) incluyendo `codSistema: "SIGEC_RTF"` y `codProceso: "EVIDENCIA_RTF"`.
   - En la base de datos `SIGEC_RTF` (`SRT_TMD_EVIDENCIA`), almacenar únicamente la referencia por identificador único `ide_archivo` (`uniqueidentifier` / GUID).

2. **Principios SOLID en la Integración**:
   - **Single Responsibility Principle (SRP)**: Creación de un servicio especializado `IArchivoClienteServicio` en la capa de infraestructura/negocio del backend para gestionar la comunicación HTTP con `sel-api-archivos`.
   - **Interface Segregation Principle (ISP)**: Abstraer las operaciones de archivos fuera del repositorio principal de RTF.

3. **Motor de Validaciones de Consistencia Cruzada**:
   - Validación en **Frontend** (`apps/sigec-rtf`): Formato estrictamente `.pdf` y tamaño máximo de **10 MB** client-side.
   - Validación en **Backend** (`SIGEC_RTF.Api`): Reglas de negocio pre-envío (`POST /rtfs/{id}/enviar`):
     - **Regla V1**: Todo avance reportado en metas (`canEjecutada > 0`) o gastos (`numMontoRendido > 0`) debe contar con al menos un archivo en `SRT_TMD_EVIDENCIA`.
     - **Regla V2**: No se permiten gastos rendidos mayores a cero (`numMontoRendido > 0`) con metas de avance en cero o nulas.

---

## 3. HOJA DE RUTA / PLAN FASEADO DE TRABAJO

### **Fase 1: Conexión Backend con `sel-api-archivos`**
- Configuración de `HttpClient` y `FileStorage:UseExternalApi` en `SIGEC_RTF.Api`.
- Inyección de `IArchivoClienteServicio` para subida y canalización (*streaming*) de descargas por GUID.
- Actualización de `RegistrarEvidenciaAsync` y `EliminarEvidenciaAsync`.

### **Fase 2: Motor de Validaciones y Consistencia Cruzada en Backend**
- Implementación de reglas de consistencia V1 y V2 en `EnviarRtfAsync`.
- Retorno estandarizado de `RespuestaEstandar` / `ResponseDto` con código HTTP 400 y desglose de errores.

### **Fase 3: Refactorización y Pre-Validación en Frontend (`apps/sigec-rtf`)**
- Validación client-side de tamaño (<= 10MB) y extensión (`.pdf`).
- Creación de Modal de Checklist de Pre-Validación interactivo antes del envío formal.
- Despliegue de alertas dinámicas en caso de inconsistencias detectadas por la API.

---

## 4. CONSECUENCIAS

- ✅ **Conformidad con Estándares MIDAGRI**: Centralización de archivos en la infraestructura oficial.
- ✅ **Alta Mantenibilidad y Trazabilidad**: Registros de auditoría SHA256 centralizados en `BD_API_FILE`.
- ✅ **Integridad de Datos**: Imposibilidad de enviar RTFs con gastos sin sustento o inconsistencias financieras.
