import { Desembolso, SettlementBalance } from '../../domain/models/desembolso.model';

export class DesembolsoMapper {
    static fromApi(dto: any): Desembolso {
        return {
            id: dto.id,
            fechaSolicitud: dto.fechaSolicitud,
            estadoId: dto.estadoId,
            estadoNombre: dto.estadoNombre,
            tipoPagoNombre: dto.tipoPagoNombre,
            montoTotalDesembolsado: dto.montoTotalDesembolsado,
            montoRendido: dto.montoRendido,
            numeroNoObjecion: dto.numeroNoObjecion,
            numeroSolicitud: dto.numeroSolicitud,
            observacion: dto.observacion
        };
    }

    static fromSaldoApi(dto: any): SettlementBalance {
        return {
            id: dto.id,
            montoTotal: dto.montoTotal,
            desembolsado: dto.desembolsado,
            saldoDisponible: dto.saldoDisponible
        };
    }

    static toApiRequest(desembolso: Partial<Desembolso>): any {
        return {
            numeroSolicitud: desembolso.numeroSolicitud,
            postulanteId: desembolso.postulanteId,
            tipoPagoId: desembolso.tipoPagoId,
            fechaDesembolso: desembolso.fechaDesembolso,
            observacion: desembolso.observacion,
            items: desembolso.items
        };
    }
}
