import { DesembolsoMapper } from './desembolso.mapper';

describe('DesembolsoMapper', () => {
    it('should map an API DTO to a Desembolso domain model', () => {
        const dto = {
            id: 1,
            fechaSolicitud: '2026-08-01',
            estadoId: 2,
            estadoNombre: 'Aprobado',
            tipoPagoNombre: 'Transferencia',
            montoTotalDesembolsado: 1500,
            montoRendido: 300,
            numeroNoObjecion: 'NO-2026-01',
            numeroSolicitud: 'SOL-001',
            observacion: 'Sin observaciones'
        };

        const result = DesembolsoMapper.fromApi(dto);

        expect(result).toEqual(dto);
    });

    it('should map a saldo API DTO to a SettlementBalance model', () => {
        const dto = { id: 1, montoTotal: 1000, desembolsado: 400, saldoDisponible: 600 };

        expect(DesembolsoMapper.fromSaldoApi(dto)).toEqual(dto);
    });

    it('should build the API request payload with only the writable fields', () => {
        const desembolso = {
            id: 99, // no debe viajar en el request
            estadoId: 2, // no debe viajar en el request
            numeroSolicitud: 'SOL-002',
            postulanteId: 10,
            tipoPagoId: 3,
            fechaDesembolso: '2026-08-10',
            observacion: 'Adelanto',
            items: [{ itemAdjudicadoId: 1, montoSolicitado: 500 }]
        };

        const result = DesembolsoMapper.toApiRequest(desembolso);

        expect(result).toEqual({
            numeroSolicitud: 'SOL-002',
            postulanteId: 10,
            tipoPagoId: 3,
            fechaDesembolso: '2026-08-10',
            observacion: 'Adelanto',
            items: [{ itemAdjudicadoId: 1, montoSolicitado: 500 }]
        });
        expect(result.id).toBeUndefined();
        expect(result.estadoId).toBeUndefined();
    });
});
