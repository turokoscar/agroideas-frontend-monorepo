import { EvaluacionNoObjecion, aSolicitud, adjudicadoNoEsElMenor, adjudicar, ofertasDe, precioDe, totalHoja } from './evaluacion-no-objecion.model';

describe('evaluacion-no-objecion.model', () => {
    const evaluacion = (): EvaluacionNoObjecion => ({
        id: 1, postulanteId: 5, estado: 'BORRADOR', editable: true, version: 3, cartaOa: '', evaluador: 'E',
        items: [{ itemMlId: 10, cantidad: 2, resultado: null }, { itemMlId: 11, cantidad: 1, resultado: null }],
        cotizaciones: [
            { ruc: '20440983261', fechaCotizacion: '', precios: [{ itemMlId: 10, precioUnitario: 100, cumple: true, adjudicado: true }, { itemMlId: 11, precioUnitario: null, cumple: null, adjudicado: false }] },
            { ruc: '20480297289', precios: [{ itemMlId: 10, precioUnitario: 90, cumple: true, adjudicado: false }, { itemMlId: 99, precioUnitario: 1, cumple: true, adjudicado: false }] },
            { ruc: '204', precios: [] },
            { ruc: '20440983261', precios: [] }
        ]
    });

    it('omits sheets still being typed, empty prices and prices of removed items', () => {
        const s = aSolicitud(evaluacion()) as any;

        expect(s.version).toBe(3);
        expect(s.cartaOa).toBeNull();
        expect(s.cotizaciones.map((c: any) => c.ruc)).toEqual(['20440983261', '20480297289']);
        expect(s.cotizaciones[0].fechaCotizacion).toBeNull();
        expect(s.cotizaciones.map((c: any) => c.precios.length)).toEqual([1, 1]);
    });

    it('allows a single winner per item', () => {
        const e = evaluacion();
        adjudicar(e, 10, '20480297289');
        expect(ofertasDe(e, 10).filter(o => o.precio.adjudicado).map(o => o.hoja.ruc)).toEqual(['20480297289']);
    });

    it('detects when the winner is not the lowest compliant price', () => {
        const e = evaluacion();
        expect(adjudicadoNoEsElMenor(e, 10)).toBe(true);
        Object.assign(e.cotizaciones[1], { verificado: true, estadoSunat: 'BAJA DE OFICIO', condicionSunat: 'HABIDO' });
        expect(adjudicadoNoEsElMenor(e, 10)).toBe(false);
        e.cotizaciones[1].estadoSunat = 'ACTIVO';
        precioDe(e.cotizaciones[1], 10).cumple = false;
        expect(adjudicadoNoEsElMenor(e, 10)).toBe(false);
    });

    it('adds up the sheet as quantity by price', () => {
        const e = evaluacion();
        expect(totalHoja(e, e.cotizaciones[0])).toBe(200);
    });
});
