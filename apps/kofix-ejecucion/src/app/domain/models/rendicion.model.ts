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
