export interface Desembolso {
    id: number;
    fechaSolicitud: string | Date;
    estadoId: number;
    estadoNombre: string;
    tipoPagoNombre: string;
    montoTotalDesembolsado: number;
    montoRendido: number;
    numeroNoObjecion: string;
    numeroSolicitud?: string;
    /** Sin rendición y con sus N.O. abiertas (saldo no solicitado). Lo calcula el backend (ADR 0012 Fase 2). */
    puedeAnular?: boolean;

    // Campos opcionales para registro
    postulanteId?: number;
    tipoPagoId?: number;
    fechaDesembolso?: string | Date;
    observacion?: string;
    items?: DesembolsoItemRequest[];
}

export interface DesembolsoItemRequest {
    itemAdjudicadoId: number;
    montoSolicitado: number;
    observacion?: string;
}

export interface SettlementBalance {
    id: number;
    montoTotal: number;
    desembolsado: number;
    saldoDisponible: number;
}

export interface DesembolsoDetalleItem {
    id: number;
    noObjecionDetId: number;
    tipoPagoId?: number;
    noObjecionCodigo?: string;
    itemNombre?: string;
    proveedorNombre?: string;
    montoSolicitado: number;
    observacion?: string;
}

/** Cheque de gerencia en DEVENGADO, pendiente de que el Supervisor lo active (pase a GIRADO). Ver ADR-020. */
export interface DesembolsoChequePendiente {
    id: number;
    ideCheque: number;
    correlativo: string;
    postulanteId: number;
    numeroSolicitud: string;
    monto: number;
    fechaDevengado: string | Date;
    observacion?: string;
}
