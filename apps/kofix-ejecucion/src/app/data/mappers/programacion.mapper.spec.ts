import { ProgramacionMapper } from './programacion.mapper';

describe('ProgramacionMapper', () => {
    describe('fromItemApi', () => {
        it('should prefer descripcion over item, and fall back to a default unidadMedida', () => {
            const dto = { id: 1, descripcion: 'Fertilizante', item: 'Ignorado', unidadMedida: undefined };

            const result = ProgramacionMapper.fromItemApi(dto);

            expect(result.item).toBe('Fertilizante');
            expect(result.unidadMedida).toBe('U.');
        });

        it('should fall back to item when descripcion is missing', () => {
            const dto = { id: 1, item: 'Semillas', unidadMedida: 'KG' };

            const result = ProgramacionMapper.fromItemApi(dto);

            expect(result.item).toBe('Semillas');
            expect(result.unidadMedida).toBe('KG');
        });

        it('should compute saldo fields from montoAprobado/montoProgramado and metaAprobada/metaProgramada', () => {
            const dto = {
                id: 1,
                descripcion: 'Riego tecnificado',
                montoAprobado: 800,
                montoProgramado: 300,
                metaAprobada: 100,
                metaProgramada: 40
            };

            const result = ProgramacionMapper.fromItemApi(dto);

            expect(result.metaFisica).toBe(100);
            expect(result.metaFinanciera).toBe(800);
            expect(result.fisicaProgramadaTotal).toBe(40);
            expect(result.financieraProgramadaTotal).toBe(300);
            expect(result.saldo).toBe(500);
            expect(result.saldoFisico).toBe(60);
            expect(result.saldoFinanciero).toBe(500);
        });

        it('should default numeric fields to 0 when nothing is provided', () => {
            const result = ProgramacionMapper.fromItemApi({ id: 1, descripcion: 'Sin montos' });

            expect(result.metaFisica).toBe(0);
            expect(result.metaFinanciera).toBe(0);
            expect(result.metaProgramada).toBe(0);
            expect(result.montoProgramado).toBe(0);
            expect(result.saldo).toBe(0);
            expect(result.saldoFisico).toBe(0);
            expect(result.saldoFinanciero).toBe(0);
        });
    });

    describe('fromApi', () => {
        it('should map the datos array from the API response', () => {
            const res = { datos: [{ id: 1, descripcion: 'A' }, { id: 2, descripcion: 'B' }] };

            const result = ProgramacionMapper.fromApi(res);

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe(1);
            expect(result[1].item).toBe('B');
        });

        it('should default to an empty array when datos is missing', () => {
            expect(ProgramacionMapper.fromApi({})).toEqual([]);
        });
    });
});
