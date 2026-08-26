export interface Rendicion {
    id: number;
    solicitudDesembolsoId: number;
    sunatCpeId: number;
    numeroSolicitud: string;
    tipoCpe: string;
    serie: string;
    numero: string;
    serieNumero: string;
    fechaEmision: string | Date;
    total: number;
    observacion: string;
    estado: number;
}

export interface RendicionRequest {
    solicitudDesembolsoId: number;
    sunatCpeId: number;
    serie: string;
    numero: string;
    fechaEmision: string;
    totalComprobante: number;
    observacion?: string;
    detalles: RendicionDetalleRequest[];
    archivos?: RendicionArchivoRequest[];
}

export interface RendicionDetalleRequest {
    solicitudDesembolsoDetId: number;
    montoRendido: number;
}

export interface RendicionArchivoRequest {
    tipoArchivoId: number;
    urlArchivo: string;
}

export interface RendicionListResponse {
    items: Rendicion[];
    total: number;
}

export interface RendicionDetalleItem {
    solicitudDesembolsoDetId: number;
    itemNombre: string;
    montoDesembolsado: number;
    montoRendido: number;
    saldoDisponible: number;
}

export interface RendicionDetalle {
    id: number;
    solicitudDesembolsoId: number;
    sunatCpeId: number;
    serie: string;
    numero: string;
    fechaEmision: string;
    total: number;
    observacion?: string;
    estado: number;
    detalles: RendicionDetalleItem[];
    archivos: RendicionArchivoRequest[];
}

export interface GastoF1 {
    rendicionId: number;
    itemNombre: string;
    unidadMedida: string;
    cantidad: number;
    precioAdjudicado: number;
    montoRendido: number;
    fechaEmision: string | Date;
    serieNumero: string;
    tipoCpe: string;
    proveedorNombre?: string;
    proveedorRuc?: string;
    archivoUrl?: string;
    ideArchivo?: string;
}
