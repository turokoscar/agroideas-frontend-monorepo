import { NoObjecion, NoObjecionDetail, NoObjecionBalance } from '../../domain/models/no-objecion.model';
import { NoObjecionProgrammedItem } from '../../domain/models/no-objecion-programmed-item.model';

export class NoObjecionMapper {
    static fromApi(dto: any): NoObjecion {
        return {
            id: dto.id,
            tipoDocumentoId: dto.tipoDocumentoId,
            tipoDocumentoNombre: dto.tipoDocumentoNombre,
            numeroDocumento: dto.numeroDocumento,
            fechaDocumento: dto.fechaDocumento,
            archivoUrl: dto.archivoUrl,
            postulanteId: dto.postulanteId,
            observacion: dto.observacion,
            estadoNombre: dto.estadoNombre,
            totalMonto: dto.totalMonto,
            saldoMonto: dto.saldoMonto,
            tipoNumeroDoc: dto.tipoNumeroDoc,
            numSolicitudes: dto.numSolicitudes,
            detalles: (dto.detalles || []).map((d: any) => this.fromDetailApi(d))
        };
    }

    static fromDetailApi(dto: any): NoObjecionDetail {
        return {
            id: dto.id,
            noObjecionId: dto.noObjecionId,
            itemMlId: dto.itemMlId,
            itemNombre: dto.itemNombre,
            itemCodigo: dto.itemCodigo,
            cantidad: dto.cantidad,
            precioAdjudicado: dto.precioAdjudicado,
            montoAdjudicado: dto.montoAdjudicado,
            rucProveedor: dto.rucProveedor,
            razonSocialProveedor: dto.razonSocialProveedor,
            tipoItemRef: dto.tipoItemRef
        };
    }

    static fromBalanceApi(dto: any): NoObjecionBalance {
        const itemId = dto.id ?? dto.ItemMlId ?? dto.ide_itemMl;
        const montoComprometido = dto.imp_montoComprometido ?? dto.MontoComprometido ?? 0;
        const cantidadComprometida = dto.can_cantidadComprometida ?? dto.CantidadComprometida ?? 0;
        const saldoFisico = dto.saldoFisico ?? dto.SaldoFisico ?? (dto.metaFisica ? dto.metaFisica - cantidadComprometida : undefined);
        const saldoFinanciero = dto.saldoFinanciero ?? dto.SaldoFinanciero ?? (dto.aporteAgroideas ? dto.aporteAgroideas - montoComprometido : undefined);
        return {
            itemId,
            montoComprometido,
            cantidadComprometida,
            saldoFisico,
            saldoFinanciero
        };
    }

    static fromProgrammedItemApi(dto: any): NoObjecionProgrammedItem {
        return {
            id: dto.id,
            codigo: dto.codigo ?? '',
            nombre: dto.nombre ?? dto.descripcion ?? '',
            metaFisica: dto.metaFisica ?? 0,
            aporteAgroideas: dto.aporteAgroideas ?? 0,
            cantidadComprometida: dto.cantidadComprometida ?? 0,
            montoComprometido: dto.montoComprometido ?? 0,
            saldoFisico: dto.saldoFisico ?? ((dto.metaFisica ?? 0) - (dto.cantidadComprometida ?? 0)),
            saldoFinanciero: dto.saldoFinanciero ?? ((dto.aporteAgroideas ?? 0) - (dto.montoComprometido ?? 0))
        };
    }

    static toApiRequest(noObjecion: Partial<NoObjecion>): any {
        return {
            tipoDocumentoId: noObjecion.tipoDocumentoId,
            numeroDocumento: noObjecion.numeroDocumento,
            fechaDocumento: noObjecion.fechaDocumento,
            archivoUrl: noObjecion.archivoUrl,
            postulanteId: noObjecion.postulanteId,
            observacion: noObjecion.observacion,
            detalles: noObjecion.detalles?.map(d => ({
                itemMlId: d.itemMlId,
                cantidad: d.cantidad,
                precioAdjudicado: d.precioAdjudicado,
                montoAdjudicado: d.montoAdjudicado,
                rucProveedor: d.rucProveedor,
                razonSocialProveedor: d.razonSocialProveedor,
                tipoItemRef: d.tipoItemRef
            }))
        };
    }
}
