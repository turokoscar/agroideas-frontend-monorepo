import { parseSeccionRevision } from './revision-seccion.util';

describe('parseSeccionRevision', () => {
  it('parses a META section', () => {
    expect(parseSeccionRevision('UR_META_7')).toEqual({ kind: 'META', id: 7 });
  });

  it('parses an INDICADOR section', () => {
    expect(parseSeccionRevision('UR_INDICADOR_23')).toEqual({ kind: 'INDICADOR', id: 23 });
  });

  it('parses an R1 section, whose id can itself contain the RTF id after a second underscore-free kind', () => {
    expect(parseSeccionRevision('UR_R1_142')).toEqual({ kind: 'R1', id: 142 });
  });

  it('returns null when there is no separator left after stripping the UR_ prefix', () => {
    expect(parseSeccionRevision('UR_META')).toBeNull();
    expect(parseSeccionRevision('GENERAL')).toBeNull();
  });

  it('returns null when the trailing id is not numeric', () => {
    expect(parseSeccionRevision('UR_META_abc')).toBeNull();
  });
});
