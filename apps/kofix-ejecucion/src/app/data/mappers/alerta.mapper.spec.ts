import { AlertaMapper } from './alerta.mapper';

describe('AlertaMapper', () => {
    it('should map API DTO to Alerta domain model with fallback defaults', () => {
        const dto = {
            id: 50,
            postulanteId: 101,
            tipo: 'FIN_PLAN',
            tipoLabel: 'Fin de Plan',
            fecha: '2026-08-01',
            numeroConvenio: 'CONV-001',
            organizacion: 'Asociación Central',
            severidad: 'Critica',
            mensaje: 'Vence en 5 días'
        };

        const result = AlertaMapper.fromApi(dto);

        expect(result.id).toBe(50);
        expect(result.postulanteId).toBe(101);
        expect(result.tipo).toBe('FIN_PLAN');
        expect(result.tipoLabel).toBe('Fin de Plan');
        expect(result.severidad).toBe('Critica');
        expect(result.mensaje).toBe('Vence en 5 días');
    });

    it('should map KPIs DTO to AlertaKpis model correctly', () => {
        const dto = {
            kpiFinPlan: 5,
            kpiSinEjecucion: 3,
            kpiVarianzas: 2,
            totalAlertas: 10
        };

        const result = AlertaMapper.fromKpisApi(dto);

        expect(result.kpiFinPlan).toBe(5);
        expect(result.kpiSinEjecucion).toBe(3);
        expect(result.kpiVarianzas).toBe(2);
        expect(result.totalAlertas).toBe(10);
    });
});
