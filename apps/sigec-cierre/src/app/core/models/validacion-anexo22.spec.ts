import { Anexo22Datos } from './anexo22.model';
import { faltantesAnexo22, requisitosAnexo22 } from './validacion-anexo22';

const completo = (): Anexo22Datos =>
  ({
    txtAnalisisProduccion: 'a', txtAnalisisPrecios: 'a', txtAnalisisComercializacion: 'a', txtAnalisisIngresos: 'a',
    txtAnalisisObjetivos: 'a', financiamiento: [{ tipFuente: 'AGROIDEAS' }], txtAnalisisFinanciamiento: 'a',
    txtAnalisisItems: 'a', txtLogros: 'a', txtLeccionesAprendidas: 'a', txtConclusiones: 'a', txtRecomendaciones: 'a',
    tipResultado: 'CONFORME',
    precios: [{}], comercializacion: [{}], ingresos: [{}], objetivosEspecificos: [{}]
  }) as unknown as Anexo22Datos;

describe('faltantesAnexo22', () => {
  it('un informe completo no tiene faltantes', () => {
    expect(faltantesAnexo22(completo())).toEqual([]);
  });

  it('mismos campos que CompletitudAnexo22, con el id de su control', () => {
    const a = { ...completo(), txtAnalisisPrecios: ' ', financiamiento: [], txtConclusiones: null, tipResultado: null };
    expect(faltantesAnexo22(a).map(f => f.id)).toEqual(['a22-txtAnalisisPrecios', null, 'a22-conclusiones', 'a22-resultado']);
  });

  it('sin indicadores en 2.2, 2.3, 2.4 o III, su análisis no es requisito; el de 2.1 sí', () => {
    const sinIndicadores = {
      ...completo(), precios: [], comercializacion: [], ingresos: [], objetivosEspecificos: [],
      txtAnalisisPrecios: null, txtAnalisisComercializacion: null, txtAnalisisIngresos: null, txtAnalisisObjetivos: null,
      txtAnalisisProduccion: null
    };
    expect(faltantesAnexo22(sinIndicadores).map(f => f.id)).toEqual(['a22-txtAnalisisProduccion']);
    expect(requisitosAnexo22(sinIndicadores).filter(r => r.paso === 'indicadores')).toHaveLength(1);
  });

  it('cada requisito pertenece a un paso del formulario (ADR 0015, D1)', () => {
    const porPaso = requisitosAnexo22(completo()).reduce<Record<string, number>>((n, r) => ({ ...n, [r.paso]: (n[r.paso] ?? 0) + 1 }), {});
    expect(porPaso).toEqual({ indicadores: 5, financiera: 3, conclusiones: 5 });
  });
});
