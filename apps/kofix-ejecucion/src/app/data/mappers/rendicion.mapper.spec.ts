import { RendicionMapper } from './rendicion.mapper';

describe('RendicionMapper', () => {
    const dto = {
        id: 1,
        solicitudDesembolsoId: 10,
        sunatCpeId: 20,
        numeroSolicitud: 'SOL-001',
        tipoCpe: 'FACTURA',
        serie: 'F001',
        numero: '000123',
        serieNumero: 'F001-000123',
        fechaEmision: '2026-08-01',
        total: 450.5,
        observacion: 'Compra de insumos',
        estado: 1
    };

    it('should map an API DTO to a Rendicion domain model', () => {
        expect(RendicionMapper.fromApi(dto)).toEqual(dto);
    });

    it('should map a list of API DTOs preserving order', () => {
        const result = RendicionMapper.fromApiList([dto, { ...dto, id: 2 }]);

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe(1);
        expect(result[1].id).toBe(2);
    });

    it('should map an empty list to an empty array', () => {
        expect(RendicionMapper.fromApiList([])).toEqual([]);
    });
});
