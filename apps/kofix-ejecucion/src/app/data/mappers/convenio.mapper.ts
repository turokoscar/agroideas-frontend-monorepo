import { Convenio, EstadoConvenio } from '../../domain/models/convenio.model';

export interface ConvenioDto {
    id: number;
    numeroConvenio: string;
    ruc: string;
    razonSocial: string;
    fechaInicio: string;
    fechaFin: string;
    montoAprobado?: number;
    montoProgramado?: number;
    montoEjecutado?: number;
    ejecucionAcumulada?: number;
    saldoPorProgramar?: number;
    saldoPorEjecutar?: number;
    programacionAcumulada?: number;
    saldoDisponible?: number;
    estado: EstadoConvenio;
    region?: string;
    ubicacion?: string;
    asignadoA?: string;
    especialista?: string;
    email?: string;
    periodo?: number;
    duracion?: number;
}

export class ConvenioMapper {
    static fromApi(dto: ConvenioDto): Convenio {
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
            saldoDisponible: dto.saldoDisponible ?? (dto.montoAprobado ?? 0) - (dto.ejecucionAcumulada ?? dto.montoEjecutado ?? 0),
            estado: dto.estado,
            region: dto.region ?? dto.ubicacion?.split('/')[0]?.trim() ?? '',
            asignadoA: dto.asignadoA ?? dto.especialista ?? '',
            email: dto.email ?? '',
            periodo: dto.periodo ?? 0,
            duracion: dto.duracion ?? 0
        };
    }

    static fromApiList(dtos: ConvenioDto[]): Convenio[] {
        return (dtos || []).map(dto => this.fromApi(dto));
    }
}
