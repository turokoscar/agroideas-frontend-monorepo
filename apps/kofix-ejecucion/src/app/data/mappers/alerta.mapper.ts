import { Alerta, AlertaKpis, AlertaSeveridad, AlertaTipo } from '../../domain/models/alerta.model';

export class AlertaMapper {
    static fromApi(dto: any, index: number = 0): Alerta {
        return {
            id: dto.id ?? (dto.postulanteId * 1000 + index),
            postulanteId: dto.postulanteId ?? 0,
            tipo: (dto.tipo as AlertaTipo) ?? 'FIN_PLAN',
            tipoLabel: dto.tipoLabel ?? '',
            fecha: dto.fecha ?? '',
            numeroConvenio: dto.numeroConvenio ?? '',
            organizacion: dto.organizacion ?? '',
            severidad: (dto.severidad as AlertaSeveridad) ?? 'Baja',
            mensaje: dto.mensaje ?? ''
        };
    }

    static fromKpisApi(dto: any): AlertaKpis {
        return {
            kpiFinPlan: dto?.kpiFinPlan ?? 0,
            kpiSinEjecucion: dto?.kpiSinEjecucion ?? 0,
            kpiVarianzas: dto?.kpiVarianzas ?? 0,
            totalAlertas: dto?.totalAlertas ?? 0
        };
    }
}
