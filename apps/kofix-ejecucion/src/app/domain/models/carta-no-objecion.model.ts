/** Carta de No Objeción (API ADR-032 entrega 3). */
export interface CartaNoObjecion {
    id?: number;
    estado?: 'BORRADOR' | 'EMITIDA';
    estadoNoObjecion: string;
    numeroInforme?: string;
    fechaInforme?: string;
    destinatario?: string;
    cargoDestinatario?: string;
    ubigeo?: string;
    /** Sin valor: falta generar el Word, o cambió después de generarlo. */
    fechaGenerada?: string;
    numero?: string;
    fecha?: string;
    ideArchivo?: string;
}

export interface CartaHistorial {
    id: number;
    estado: 'BORRADOR' | 'EMITIDA' | 'ANULADA';
    numero?: string;
    fecha?: string;
    ideArchivo?: string;
    motivoAnulacion?: string;
    fechaAnulacion?: string;
    montoAgroideas?: number;
}

export interface CartaBorrador {
    destinatario: string;
    cargoDestinatario: string;
    ubigeo: string;
}

/** El número y la fecha los asigna el SGD. */
export interface CartaEmision {
    numero: string;
    fecha: string;
    ideArchivo: string;
}
