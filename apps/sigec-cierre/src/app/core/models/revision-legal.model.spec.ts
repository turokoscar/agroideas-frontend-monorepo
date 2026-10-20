import { ObservacionUajDto, agruparPorRonda, pendientesDeSubsanar, ultimaRonda } from './revision-legal.model';

const obs = (ideObservacion: number, numRonda: number, numOrden: number, txtRespuesta: string | null = null): ObservacionUajDto => ({
  ideObservacion, ideCierreConvenio: 6, numRonda, numOrden, txtObservacion: `Obs ${ideObservacion}`, ideUsuario: 1,
  fecRegistro: '2026-10-20T10:00:00', txtRespuesta, ideUsuarioRespuesta: null, fecRespuesta: null
});

describe('revision-legal.model', () => {
  const lista = [obs(1, 1, 1, 'Corregido'), obs(3, 2, 2), obs(2, 2, 1), obs(4, 2, 3, 'Ya respondida')];

  it('agrupa por ronda, de la más reciente a la primera, y ordena cada ronda', () => {
    expect(agruparPorRonda(lista).map(r => [r.numRonda, r.observaciones.map(o => o.ideObservacion)])).toEqual([[2, [2, 3, 4]], [1, [1]]]);
  });

  it('la última ronda y sus pendientes (sin respuesta) son las que se subsanan', () => {
    expect(ultimaRonda(lista)).toBe(2);
    expect(pendientesDeSubsanar(lista).map(o => o.ideObservacion)).toEqual([2, 3]);
    expect(ultimaRonda([])).toBe(0);
  });
});
