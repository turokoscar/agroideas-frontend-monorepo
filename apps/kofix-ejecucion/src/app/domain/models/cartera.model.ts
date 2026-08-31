export interface CarteraItem {
    postulanteId: number;
    nroRuc: string;
    razonSocial: string;
    email: string;
    numeroConvenio: string;
    periodo: number;
    duracion: number;
    fechaFirma: string;
    fechaFin: string;
    region: string;
    estadoSituacional: string;
    montoAprobado: number;
    montoProgramado: number;
    montoEjecutado: number;
    ejecucionAcumulada: number;
    saldoPorProgramar: number;
    saldoPorEjecutar: number;
    saldo: number;
    asignadoA: string;
}

export interface CarteraListResponse {
    items: CarteraItem[];
    total: number;
}
