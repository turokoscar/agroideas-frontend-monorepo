import { formatConvenioNumber, formatSolicitudNumber } from './convenio-number';

describe('formatConvenioNumber', () => {
  it('rellena a 4 dígitos y usa el año de la fecha de firma', () => {
    expect(formatConvenioNumber('48', '2023-05-10')).toBe('0048-2023-ST');
    expect(formatConvenioNumber(48, new Date(2023, 4, 10))).toBe('0048-2023-ST');
    expect(formatConvenioNumber('0048', '2023-05-10T00:00:00')).toBe('0048-2023-ST');
  });

  it('toma el año escrito en la fecha ISO, sin desfase de zona horaria', () => {
    // new Date('2026-01-01') es medianoche UTC: en Lima sería el 31/12/2025.
    expect(formatConvenioNumber('12', '2026-01-01')).toBe('0012-2026-ST');
  });

  it('devuelve tal cual un número ya formateado', () => {
    expect(formatConvenioNumber('0176-2023-ST', '2020-01-01')).toBe('0176-2023-ST');
    expect(formatConvenioNumber(' 0176-2023-st ')).toBe('0176-2023-st');
  });

  it('devuelve tal cual un número no numérico', () => {
    expect(formatConvenioNumber('S/N', '2023-05-10')).toBe('S/N');
  });

  it('usa "-" sin número', () => {
    expect(formatConvenioNumber(null)).toBe('-');
    expect(formatConvenioNumber(undefined)).toBe('-');
    expect(formatConvenioNumber('  ')).toBe('-');
  });

  it('usa "XXXX" sin fecha de firma válida, incluida la fecha mínima de .NET', () => {
    expect(formatConvenioNumber('48')).toBe('0048-XXXX-ST');
    expect(formatConvenioNumber('48', '0001-01-01T00:00:00')).toBe('0048-XXXX-ST');
    expect(formatConvenioNumber('48', 'no es fecha')).toBe('0048-XXXX-ST');
  });
});

describe('formatSolicitudNumber', () => {
  it('formatea "NNNN-YYYY"', () => {
    expect(formatSolicitudNumber(7, '2026-01-01')).toBe('0007-2026');
    expect(formatSolicitudNumber('')).toBe('-');
  });
});

