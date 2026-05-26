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
    detalles: NoObjecionDetail[];
}

export interface NoObjecionBalance {
    itemId?: number;
    montoComprometido: number;
    cantidadComprometida: number;
    saldoFisico?: number;
    saldoFinanciero?: number;
}
