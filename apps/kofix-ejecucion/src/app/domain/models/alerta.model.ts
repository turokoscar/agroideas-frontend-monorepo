export type AlertaTipo = 'FIN_PLAN' | 'SIN_EJECUCION' | 'VARIANZA';
export type AlertaSeveridad = 'Critica' | 'Alta' | 'Media' | 'Baja';

export interface Alerta {
    id: number;
    postulanteId: number;
    tipo: AlertaTipo;
    tipoLabel: string;
    fecha: string;
    numeroConvenio: string;
    organizacion: string;
    severidad: AlertaSeveridad;
    mensaje: string;
}

export interface AlertaKpis {
    kpiFinPlan: number;
    kpiSinEjecucion: number;
    kpiVarianzas: number;
    totalAlertas: number;
}

export interface AlertaFilter {
    tipo?: string;
    severidad?: string;
    pagina?: number;
    cantidad?: number;
}

export interface AlertaListResponse {
    kpis: AlertaKpis;
    items: Alerta[];
    total: number;
}
