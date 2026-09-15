/** Fila del reporte de productividad UN (ADR-012/013), una por especialista resolutor. */
export interface ReporteProductividadUnItemDto {
  ideUsuario: number;
  txtUsuario: string;
  expedientesAtendidos: number;
  promedioDias: number;
}
