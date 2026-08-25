export interface ProgramacionItem {
    id: number;
    postulanteID?: number;
    orden?: number;
    codigo?: string;
    item: string;
    nombre?: string;
    descripcion?: string;
    tipo?: string;
    unidadMedida?: string;
    metaFisica: number;
    metaFinanciera: number;
    metaAprobada?: number;
    metaProgramada?: number;
    aporteAgroideas?: number;
    montoAprobado?: number;
    montoProgramado?: number;
    contrapartida?: number;
    especificaciones?: string;
    evidencia?: string;
    fisicaProgramadaTotal?: number;
    financieraProgramadaTotal?: number;
    saldo?: number;
    saldoFisico?: number;
    saldoFinanciero?: number;
}

export type ItemProgramacion = ProgramacionItem;

export interface DetalleCronograma {
    mes: number;
    metaFisica: number;
    metaFinanciera: number;
    fecha?: string;
}

export interface GuardarCronogramaRequest {
    marcoLogicoId: number;
    postulanteId: number;
    detalles: { mes: number; metaFisica: number; metaFinanciera: number; }[];
}

export interface Programacion {
    datos: ProgramacionItem[];
    total: number;
}

export interface ProgramacionResumen {
    id: number;
    numeroConvenio: string;
    razonSocial: string;
    ruc: string;
    region: string;
    estado: string;
    montoAprobado: number;
    montoProgramado: number;
    montoEjecutado: number;
    porcentajeProgramado: number;
    saldoPorProgramar: number;
    saldoPorEjecutar: number;
    fechaFirma: string;
    fechaFin: string;
}

export interface ProgramacionListResponse {
    items: ProgramacionResumen[];
    total: number;
}

export interface ProgramacionBloqueoItem {
    itemMlId: number;
    nombre?: string;
    programado: number;
    ejecutado: number;
    saldoDisponible: number;
    bloqueado: boolean;
    tieneExcepcion: boolean;
}

export interface ProgramacionBloqueoResponse {
    postulanteId: number;
    items: ProgramacionBloqueoItem[];
    totalBloqueados: number;
}