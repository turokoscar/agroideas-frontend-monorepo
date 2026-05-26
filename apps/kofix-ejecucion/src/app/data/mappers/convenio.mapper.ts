import { Convenio } from '../../domain/models/convenio.model';

export class ConvenioMapper {
    static fromApi(dto: any): Convenio {
        return {
            id: dto.id,
            numeroConvenio: dto.numeroConvenio,
            ruc: dto.ruc,
            razonSocial: dto.razonSocial,
            fechaInicio: dto.fechaInicio,
            fechaFin: dto.fechaFin,
            montoAprobado: dto.montoAprobado ?? 0,
            montoProgramado: dto.montoProgramado ?? 0,
            montoEjecutado: dto.montoEjecutado ?? dto.ejecucionAcumulada ?? 0,
            saldoPorProgramar: dto.saldoPorProgramar ?? 0,
            saldoPorEjecutar: dto.saldoPorEjecutar ?? 0,
            programacionAcumulada: dto.programacionAcumulada ?? dto.montoProgramado ?? 0,
            ejecucionAcumulada: dto.ejecucionAcumulada ?? dto.montoEjecutado ?? 0,
            saldoDisponible: dto.saldoDisponible ?? (dto.montoAprobado - (dto.ejecucionAcumulada ?? dto.montoEjecutado ?? 0)),
            estado: dto.estado,
            region: dto.region ?? dto.ubicacion?.split('/')[0]?.trim() ?? '',
            asignadoA: dto.asignadoA ?? dto.especialista ?? '',
            email: dto.email ?? '',
            periodo: dto.periodo ?? 0,
            duracion: dto.duracion ?? 0
        };
    }

    static fromApiList(dtos: any[]): Convenio[] {
        return (dtos || []).map(dto => this.fromApi(dto));
    }
}
