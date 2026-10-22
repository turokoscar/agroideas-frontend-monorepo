import { CierreDetalleDto, DocumentoCierreDto, EstadoCierre } from './cierre.model';
import { PlazoDto, diasRestantes } from './plazo.model';
import { construirEtapas, indiceEtapaActiva, plazoDeTipo } from './etapas-cierre';

function cierre(estCierre: EstadoCierre, extra: Partial<CierreDetalleDto> = {}): CierreDetalleDto {
  return {
    ideCierreConvenio: 1,
    ideConvenio: 43829,
    estCierre,
    fecInicio: '2026-10-01T10:00:00',
    fecDerivacionDE: null,
    txtContingencia: null,
    fecDerivacionUAJ: null,
    fecCierreFormal: null,
    txtNumeroConvenio: '0051-2026',
    fecFirmaConvenio: null,
    txtOrganizacion: 'Asociación Wishlaj Marca',
    codUbigeo: '020101',
    fecFinVigencia: '2026-09-30T00:00:00',
    idePasoCriticoUltimo: null,
    ideRtfUltimo: null,
    fecPresentacionUltimoRtf: null,
    fecRecepcionAnexo20: null,
    flgDeOficio: false,
    tipOrigen: 'EVENTO_RTF',
    fecVerificacionCampo: null,
    fecRemisionProyectoRde: null,
    txtNumeroRde: null,
    fecEmisionRde: null,
    ideUsuarioCierre: null,
    flgSelSincronizado: null,
    fecSelSincronizado: null,
    canIntentosSel: 0,
    txtErrorSel: null,
    documentos: [],
    ...extra
  };
}

function plazo(extra: Partial<PlazoDto>): PlazoDto {
  return {
    idePlazo: 1,
    ideCierreConvenio: 1,
    tipPlazo: 'EVALUACION_UN',
    fecInicio: '2026-10-01T00:00:00',
    canDias: 90,
    fecLimite: '2026-12-30T23:59:59',
    codDepartamento: null,
    codProvincia: null,
    estPlazo: 'VIGENTE',
    fecCierre: null,
    txtContingencia: null,
    fecRegistro: '2026-10-01T00:00:00',
    ...extra
  };
}

function documento(tipDocumento: DocumentoCierreDto['tipDocumento']): DocumentoCierreDto {
  return { ideDocumento: 1, ideCierreConvenio: 1, tipDocumento, codArchivo: 'x', txtNombreArchivo: 'a.pdf', ideUsuario: 1, fecRegistro: '2026-10-02T00:00:00' };
}

describe('etapas-cierre', () => {
  it.each<[EstadoCierre, number]>([
    ['ESPERA_ANEXO20', 0],
    ['EN_VERIFICACION', 1],
    ['EN_EVALUACION_UN', 2],
    ['DERIVADO_DE', 3],
    ['EN_REVISION_UAJ', 4],
    ['OBSERVADO_UAJ', 4],
    ['PROYECTO_RDE_REMITIDO', 5],
    ['CERRADO', 6]
  ])('en %s la etapa activa es la %i', (estado, indice) => {
    expect(indiceEtapaActiva(estado)).toBe(indice);
  });

  it('marca completadas las anteriores, activa la actual y pendientes las siguientes', () => {
    const etapas = construirEtapas(cierre('EN_EVALUACION_UN', { fecRecepcionAnexo20: '2026-10-02T00:00:00' }), []);
    expect(etapas.map(e => e.situacion)).toEqual(['completada', 'completada', 'activa', 'pendiente', 'pendiente', 'pendiente']);
    expect(etapas[0].fecha).toBe('2026-10-02T00:00:00');
    expect(etapas[2].fecha).toBeNull();
  });

  it('con el expediente cerrado completa las seis etapas', () => {
    const etapas = construirEtapas(cierre('CERRADO', { txtNumeroRde: '045-2026-MIDAGRI-PCC/DE' }), []);
    expect(etapas.every(e => e.situacion === 'completada')).toBe(true);
    expect(etapas[5].notas).toContain('RDE N° 045-2026-MIDAGRI-PCC/DE');
  });

  it('reparte los documentos vigentes por etapa', () => {
    const etapas = construirEtapas(
      cierre('PROYECTO_RDE_REMITIDO', { documentos: [documento('ANEXO_20'), documento('ANEXO_22'), documento('INFORME_LEGAL'), documento('PROYECTO_RDE')] }),
      []
    );
    expect(etapas[0].documentos.map(d => d.tipDocumento)).toEqual(['ANEXO_20']);
    expect(etapas[1].documentos).toEqual([]);
    expect(etapas[4].documentos.map(d => d.tipDocumento)).toEqual(['INFORME_LEGAL', 'PROYECTO_RDE']);
  });

  it('muestra el ciclo de observaciones como nota sobre la revisión legal, sin etapa nueva', () => {
    const etapas = construirEtapas(cierre('OBSERVADO_UAJ'), []);
    expect(etapas).toHaveLength(6);
    expect(etapas[4].situacion).toBe('activa');
    expect(etapas[4].notas[0]).toContain('Observado por la UAJ');
  });

  it('anota el paso de oficio y la contingencia', () => {
    const etapas = construirEtapas(cierre('DERIVADO_DE', { flgDeOficio: true, txtContingencia: 'Demora del SEL' }), []);
    expect(etapas[0].notas[0]).toContain('de oficio');
    expect(etapas[2].notas[0]).toContain('Demora del SEL');
  });

  it('asocia a cada etapa su plazo; las que no tienen plazo normativo quedan en null', () => {
    const etapas = construirEtapas(cierre('EN_EVALUACION_UN'), [plazo({ tipPlazo: 'EVALUACION_UN' })]);
    expect(etapas[2].plazo?.tipPlazo).toBe('EVALUACION_UN');
    expect(etapas[3].plazo).toBeNull();
  });

  describe('plazoDeTipo', () => {
    it('prefiere el vigente', () => {
      const vigente = plazo({ idePlazo: 2, tipPlazo: 'REVISION_UAJ', estPlazo: 'VIGENTE', fecRegistro: '2026-10-01T00:00:00' });
      const cancelado = plazo({ idePlazo: 3, tipPlazo: 'REVISION_UAJ', estPlazo: 'CANCELADO', fecRegistro: '2026-10-05T00:00:00' });
      expect(plazoDeTipo([cancelado, vigente], 'REVISION_UAJ')?.idePlazo).toBe(2);
    });

    it('sin vigente, devuelve el más reciente', () => {
      const viejo = plazo({ idePlazo: 2, tipPlazo: 'REVISION_UAJ', estPlazo: 'CANCELADO', fecRegistro: '2026-10-01T00:00:00' });
      const nuevo = plazo({ idePlazo: 3, tipPlazo: 'REVISION_UAJ', estPlazo: 'CUMPLIDO', fecRegistro: '2026-10-09T00:00:00' });
      expect(plazoDeTipo([viejo, nuevo], 'REVISION_UAJ')?.idePlazo).toBe(3);
      expect(plazoDeTipo([viejo, nuevo], 'ANEXO20')).toBeNull();
    });
  });

  describe('diasRestantes', () => {
    const hoy = new Date(2026, 9, 20, 15, 30);

    it('cuenta fechas calendario, no horas', () => {
      expect(diasRestantes('2026-10-20T23:59:59', hoy)).toBe(0);
      expect(diasRestantes('2026-10-25T23:59:59', hoy)).toBe(5);
    });

    it('es negativo si ya venció', () => {
      expect(diasRestantes('2026-10-18T23:59:59', hoy)).toBe(-2);
    });
  });

  it('indica la ronda de observaciones de la UAJ y la revisión tras subsanar', () => {
    expect(construirEtapas(cierre('OBSERVADO_UAJ'), [], 2)[4].notas[0]).toContain('Observado por la UAJ (ronda 2)');
    expect(construirEtapas(cierre('EN_REVISION_UAJ'), [], 2)[4].notas[0]).toContain('Subsanadas las observaciones de la ronda 2');
    expect(construirEtapas(cierre('EN_REVISION_UAJ'), [], 0)[4].notas).toEqual([]);
  });
});

