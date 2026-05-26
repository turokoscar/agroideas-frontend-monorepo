import { Programacion, ProgramacionItem } from '../../domain/models/programacion.model';

export class ProgramacionMapper {
    static fromApi(res: any): ProgramacionItem[] {
        return (res.datos || []).map((item: any) => this.fromItemApi(item));
    }

    static fromItemApi(dto: any): ProgramacionItem {
        return {
            id: dto.id,
            postulanteID: dto.postulanteID,
            orden: dto.orden,
            item: dto.descripcion || dto.item,
            nombre: dto.nombre,
            descripcion: dto.descripcion,
            tipo: dto.tipo,
            unidadMedida: dto.unidadMedida || 'U.',
            metaFisica: dto.metaAprobada || dto.metaFisica || 0,
            metaFinanciera: dto.montoAprobado || dto.metaFinanciera || 0,
            metaAprobada: dto.metaAprobada,
            metaProgramada: dto.metaProgramada || 0,
            aporteAgroideas: dto.montoAprobado,
            montoAprobado: dto.montoAprobado,
            montoProgramado: dto.montoProgramado || 0,
            contrapartida: dto.contrapartida,
            especificaciones: dto.especificaciones,
            evidencia: dto.evidencia,
            fisicaProgramadaTotal: dto.metaProgramada || 0,
            financieraProgramadaTotal: dto.montoProgramado || 0,
            saldo: (dto.montoAprobado || 0) - (dto.montoProgramado || 0),
            saldoFisico: (dto.metaAprobada || 0) - (dto.metaProgramada || 0),
            saldoFinanciero: (dto.montoAprobado || 0) - (dto.montoProgramado || 0)
        };
    }

    static toApiRequest(item: Partial<ProgramacionItem>): any {
        return {
            id: item.id,
        };
    }
}
