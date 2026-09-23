export type EstadoConvenio = 'VIGENTE' | 'POR_INICIAR' | 'FINALIZADO' | 'SIN_FECHA';

export interface Convenio {
    id: number;
    numeroConvenio: string;
    ruc: string;
    razonSocial: string;
    region: string;
    estado: EstadoConvenio;
    fechaInicio: string;
    fechaFin: string;
    montoAprobado: number;
    montoProgramado: number;
    montoEjecutado: number;
    saldoPorProgramar: number;
    saldoPorEjecutar: number;
    programacionAcumulada: number;
    ejecucionAcumulada: number;
    saldoDisponible: number;
    asignadoA: string;
    email: string;
    periodo: number;
    duracion: number;
}

export interface ConvenioResumenFinanciero {
    programacionAcumulada: number;
    ejecucionAcumulada: number;
    saldoDisponible: number;
}

export interface ResumenEjecutivo {
    totalConvenios: number;
    conveniosActivos: number;
    programacionAcumulada: number;
    ejecucionAcumulada: number;
    saldoDisponible: number;
}

export interface ReporteMensualItem {
    mes: number;
    programado: number;
    ejecutado: number;
}

export interface ReporteMensualResponse {
    reporte: ReporteMensualItem[];
}

