import { ejecutadoCierre, esCritica, nuevoIndicador, tieneDesviacionCritica, variacion } from './anexo22.model';

describe('anexo22.model (como VariacionIndicador de la API)', () => {
  it('variacion: porcentaje frente a la referencia, redondeado a 2 decimales', () => {
    expect(variacion(100, 75)).toBe(-25);
    expect(variacion(3, 4)).toBe(33.33);
    expect(variacion(0, 10)).toBeNull();
    expect(variacion(null, 10)).toBeNull();
    expect(variacion(100, null)).toBeNull();
  });

  it('esCritica: por debajo del umbral configurado (−20 %)', () => {
    expect(esCritica(-20)).toBe(false);
    expect(esCritica(-20.01)).toBe(true);
    expect(esCritica(null)).toBe(false);
  });

  it('el ejecutado al cierre es el resultado o, si no hay, el último año ejecutado', () => {
    const f = { ...nuevoIndicador(1), numEjecAnio1: 10, numEjecAnio2: 20 };
    expect(ejecutadoCierre(f)).toBe(20);
    expect(ejecutadoCierre({ ...f, numResultado: 25 })).toBe(25);
    expect(ejecutadoCierre(nuevoIndicador(1))).toBeNull();
  });

  it('marca la desviación crítica si algún año cae más del umbral', () => {
    expect(tieneDesviacionCritica({ ...nuevoIndicador(1), numProgAnio2: 100, numEjecAnio2: 70 })).toBe(true);
    expect(tieneDesviacionCritica({ ...nuevoIndicador(1), numProgAnio2: 100, numEjecAnio2: 85 })).toBe(false);
  });
});
