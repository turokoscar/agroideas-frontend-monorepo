export type TipoOperacion = 'Gasto' | 'Rendición' | 'Devolución' | 'Ajuste';
export type EstadoMovimiento = 'Pendiente' | 'Aprobado' | 'Rechazado';

export interface KardexMovimiento {
    id: number;
    convenioId: number;
    numeroConvenio: string;
    organizacion: string;
    fecha: string;
    tipo: TipoOperacion;
    documento: string;
    periodo: string;
    monto: number;
    saldoResultante: number;
    usuario: string;
    estado: EstadoMovimiento;
}

export interface KardexSummary {
    totalMovimientos: number;
    totalGastos: number;
    totalIngresos: number;
}

export interface KardexListResponse {
    items: KardexMovimiento[];
    total: number;
    summary: KardexSummary;
}

export interface KardexConsolidado {
    itemMlId: number;
    itemDescripcion: string;
    montoProgramado: number;
    montoComprometido: number;
    montoEfectivizado: number;
    montoRendido: number;
    saldo: number;
}

export interface KardexMensual {
    mes: number;
    anio: number;
    totalIngresos: number;
    totalEgresos: number;
    totalRendido: number;
    saldoFinMes: number;
}

export interface KardexDetalleItem {
    itemMlId: number;
    itemDescripcion: string;
    montoProgramado: number;
    movimientos: KardexMovimiento[];
}
