import { NoObjecionMapper } from './no-objecion.mapper';

describe('NoObjecionMapper', () => {
    it('should map API response to NoObjecion domain model correctly', () => {
        const dto = {
            id: 10,
            tipoDocumentoId: 1,
            tipoDocumentoNombre: 'OFICIO',
            numeroDocumento: 'DOC-2026-001',
            fechaDocumento: '2026-07-20',
            archivoUrl: '/files/doc.pdf',
            postulanteId: 50,
            observacion: 'Sin observaciones',
            estadoNombre: 'APROBADO',
            totalMonto: 15000,
            saldoMonto: 5000,
            tipoNumeroDoc: 'OFICIO DOC-2026-001',
            numSolicitudes: 2,
            detalles: [
                {
                    id: 101,
                    noObjecionId: 10,
                    itemMlId: 5,
                    itemNombre: 'Tractor',
                    itemCodigo: 'TRAC-01',
                    cantidad: 1,
                    precioAdjudicado: 15000,
                    montoAdjudicado: 15000,
                    rucProveedor: '20123456789',
                    razonSocialProveedor: 'Maquinarias SAC',
                    tipoItemRef: 'BIEN'
                }
            ]
        };

        const result = NoObjecionMapper.fromApi(dto);

        expect(result.id).toBe(10);
        expect(result.numeroDocumento).toBe('DOC-2026-001');
        expect(result.detalles.length).toBe(1);
        expect(result.detalles[0].itemNombre).toBe('Tractor');
        expect(result.detalles[0].montoAdjudicado).toBe(15000);
    });

    it('should calculate balance and physical/financial remainders in fromProgrammedItemApi', () => {
        const dto = {
            id: 5,
            codigo: 'ITEM-05',
            descripcion: 'Sistema de Riego',
            metaFisica: 10,
            aporteAgroideas: 20000,
            cantidadComprometida: 3,
            montoComprometido: 6000
        };

        const result = NoObjecionMapper.fromProgrammedItemApi(dto);

        expect(result.id).toBe(5);
        expect(result.nombre).toBe('Sistema de Riego');
        expect(result.saldoFisico).toBe(7);
        expect(result.saldoFinanciero).toBe(14000);
    });

    it('should map domain Partial<NoObjecion> to API request DTO', () => {
        const domainModel = {
            tipoDocumentoId: 2,
            numeroDocumento: 'N-999',
            fechaDocumento: '2026-08-01',
            postulanteId: 88,
            detalles: [
                {
                    itemMlId: 12,
                    cantidad: 2,
                    precioAdjudicado: 1000,
                    montoAdjudicado: 2000,
                    rucProveedor: '20999999999',
                    razonSocialProveedor: 'Proveedor Test SRL'
                }
            ]
        };

        const apiRequest = NoObjecionMapper.toApiRequest(domainModel as any);

        expect(apiRequest.tipoDocumentoId).toBe(2);
        expect(apiRequest.postulanteId).toBe(88);
        expect(apiRequest.detalles.length).toBe(1);
        expect(apiRequest.detalles[0].itemMlId).toBe(12);
        expect(apiRequest.detalles[0].montoAdjudicado).toBe(2000);
    });
});
