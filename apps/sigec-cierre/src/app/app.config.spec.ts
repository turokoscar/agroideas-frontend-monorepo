import { LOCALE_ID, Provider } from '@angular/core';
import { formatDate, formatNumber } from '@angular/common';
import { appConfig } from './app.config';

describe('appConfig', () => {
  const locale = (appConfig.providers as Provider[])
    .map(p => p as { provide?: unknown; useValue?: unknown })
    .find(p => p.provide === LOCALE_ID)?.useValue as string;

  it('usa es-PE como LOCALE_ID, igual que sigec-rtf y kofix-ejecucion', () => {
    expect(locale).toBe('es-PE');
  });

  it('muestra el día de la semana en español (tabla de días inhábiles) y meses peruanos', () => {
    expect(formatDate(new Date(2026, 0, 1), 'EEE dd/MM/yyyy', locale)).toBe('jue 01/01/2026');
    expect(formatDate(new Date(2026, 8, 22, 15, 17), 'dd/MM/yyyy HH:mm', locale)).toBe('22/09/2026 15:17');
    expect(formatDate(new Date(2026, 8, 22), 'longDate', locale)).toBe('22 de setiembre de 2026');
  });

  it('formatea montos con coma de miles y punto decimal', () => {
    expect(formatNumber(18000, locale, '1.2-2')).toBe('18,000.00');
  });
});
