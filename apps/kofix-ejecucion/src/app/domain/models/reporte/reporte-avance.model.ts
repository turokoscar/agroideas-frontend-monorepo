/** Nivel del semáforo de una celda (ADR-028); lo decide la API. */
export type NivelSemaforo = 'BUENA' | 'REGULAR' | 'MALA' | 'SIN_PROGRAMACION' | 'EJECUTADO_SIN_PROGRAMACION';

export interface CeldaAvance {
    /** Año y mes de la celda; null en el total del periodo. */
    anio: number | null;
    mes: number | null;
    programado: number;
    /** Pagado (ejecutado = pagado). */
    ejecutado: number;
    /** Programado - ejecutado. */
    saldo: number;
    /** Ejecutado / programado x 100, con 1 decimal; null/undefined si no hay programado. */
    porcentaje: number | null | undefined;
    nivel: NivelSemaforo;
}

export interface FilaAvance {
    region: string;
    /** Una celda por mes, en el orden de `ReporteAvance.meses`. */
    celdas: CeldaAvance[];
    total: CeldaAvance;
}

export interface ReporteAvance {
    fechaInicio: string;
    fechaFin: string;
    umbrales: { buena: number; regular: number };
    meses: { anio: number; mes: number }[];
    filas: FilaAvance[];
    totalNacional: FilaAvance;
}
