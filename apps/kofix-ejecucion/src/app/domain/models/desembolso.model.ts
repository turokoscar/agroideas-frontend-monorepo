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
