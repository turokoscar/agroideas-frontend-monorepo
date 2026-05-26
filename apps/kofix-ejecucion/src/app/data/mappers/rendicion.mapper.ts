import { Rendicion } from '../../domain/models/rendicion.model';

export class RendicionMapper {
    static fromApi(dto: any): Rendicion {
        return {
            id: dto.id,
            solicitudDesembolsoId: dto.solicitudDesembolsoId,
            sunatCpeId: dto.sunatCpeId,
            numeroSolicitud: dto.numeroSolicitud,
            tipoCpe: dto.tipoCpe,
            serie: dto.serie,
            numero: dto.numero,
            serieNumero: dto.serieNumero,
            fechaEmision: dto.fechaEmision,
            total: dto.total,
            observacion: dto.observacion,
            estado: dto.estado
        };
    }

    static fromApiList(dtos: any[]): Rendicion[] {
        return dtos.map(dto => this.fromApi(dto));
    }
}
