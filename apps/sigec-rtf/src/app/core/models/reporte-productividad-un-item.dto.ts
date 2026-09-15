/** Fila del reporte de productividad UN (ADR-012/013), una por especialista resolutor. */
export interface ReporteProductividadUnItemDto {
  ideUsuario: number;
  txtUsuario: string;
  expedientesAtendidos: number;
  promedioDias: number;
  /** % de resoluciones Rechazar/Devolver sobre el total resuelto por este especialista. Sin banda de semáforo: no hay umbral normativo definido para este indicador. */
  tasaObservacion: number;
}
