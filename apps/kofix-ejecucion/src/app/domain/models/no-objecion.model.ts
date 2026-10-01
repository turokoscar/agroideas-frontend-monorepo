export interface NoObjecionDetail {
    id?: number;
    noObjecionId?: number;
    itemMlId: number;
    itemNombre?: string;
    itemCodigo?: string;
    cantidad: number;
    precioAdjudicado: number;
    montoAdjudicado: number;
    rucProveedor: string;
    razonSocialProveedor: string;
    tipoItemRef: number; // 1: Bien, 2: Servicio
}

export interface NoObjecion {
    id?: number;
    tipoDocumentoId: number;
    tipoDocumentoNombre?: string;
    numeroDocumento: string;
    fechaDocumento: string | Date;
    archivoUrl?: string;
    postulanteId: number;
    observacion?: string;
    estadoId?: number;
    estadoNombre?: string;
    totalMonto?: number;
    saldoMonto?: number;
    tipoNumeroDoc?: string;
    numSolicitudes?: number;
    /** ADR 0012 Fase 4: monto rebajado y número de rebajas (totalMonto ya es el adjudicado vigente). */
    montoRebajado?: number;
    numRebajas?: number;
    detalles: NoObjecionDetail[];
}

export interface NoObjecionBalance {
    itemId?: number;
    montoComprometido: number;
    cantidadComprometida: number;
    saldoFisico?: number;
    saldoFinanciero?: number;
}

// ADR 0012 Fase 4 (INC-04): rebaja del saldo no solicitado de una N.O.
export interface NoObjecionDetSaldo {
    noObjecionDetId: number;
    itemMlId: number;
    itemNombre?: string;
    proveedorNombre?: string;
    montoAdjudicado: number;
    cantidad: number;
    precioUnitario: number;
    montoRebajado: number;
    montoVigente: number;
    montoSolicitado: number;
    montoDevuelto: number;
    saldoNoSolicitado: number;
    /** Unidades enteras rebajables; las calcula la API. */
    unidadesRebajables: number;
}

export interface NoObjecionRebajaHistorial {
    id: number;
    noObjecionDetId: number;
    total: boolean;
    unidades: number;
    monto: number;
    numeroCarta: string;
    fechaCarta: string | Date;
    archivoUrl?: string;
    motivo: string;
    fechaRegistro: string | Date;
}

export interface NoObjecionRebajaSaldo {
    id: number;
    postulanteId: number;
    numeroDocumento?: string;
    tipoDocumentoNombre?: string;
    fechaDocumento?: string | Date;
    detalles: NoObjecionDetSaldo[];
    rebajas: NoObjecionRebajaHistorial[];
}

export interface NoObjecionRebajaRequest {
    noObjecionDetId: number;
    /** true = "Anular saldo": rebaja todo el saldo no solicitado. */
    total: boolean;
    /** Unidades enteras (solo rebaja parcial). */
    unidades?: number;
    numeroCarta: string;
    fechaCarta: string;
    /** Identificador devuelto por sel-api-archivos al subir la carta de la organización. */
    archivoUrl: string;
    motivo: string;
}
