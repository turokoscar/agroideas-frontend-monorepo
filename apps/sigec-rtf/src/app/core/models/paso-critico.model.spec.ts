import { PasoCritico, esUltimoPasoCritico, ultimoPasoCritico } from './paso-critico.model';

const paso = (id: number, startMonth: number, endMonth: number): PasoCritico => ({
  id,
  label: `Paso Crítico ${id}`,
  startMonth,
  endMonth,
  start: new Date(2026, 0, 1),
  end: new Date(2026, 5, 30),
  status: 'Pendiente'
});

describe('ultimoPasoCritico', () => {
  const pasos = [paso(32851, 0, 6), paso(32856, 30, 36), paso(32853, 12, 18)];

  it('es el de mayor mes de fin, aunque no venga al final de la lista', () => {
    expect(ultimoPasoCritico(pasos)?.id).toBe(32856);
  });

  it('sin pasos no hay último', () => {
    expect(ultimoPasoCritico([])).toBeNull();
  });

  it('esUltimoPasoCritico compara por id', () => {
    expect(esUltimoPasoCritico(pasos, 32856)).toBe(true);
    expect(esUltimoPasoCritico(pasos, 32851)).toBe(false);
    expect(esUltimoPasoCritico(pasos, null)).toBe(false);
    expect(esUltimoPasoCritico([], 32856)).toBe(false);
  });
});
