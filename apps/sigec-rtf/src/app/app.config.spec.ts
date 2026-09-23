import { LOCALE_ID, Provider } from '@angular/core';
import { formatDate, formatNumber, formatPercent } from '@angular/common';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { appConfig } from './app.config';

/** Todos los templates .html bajo src/app. */
function templates(dir: string): string[] {
  return readdirSync(dir).flatMap(nombre => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return templates(ruta);
    return ruta.endsWith('.html') ? [ruta] : [];
  });
}

describe('appConfig', () => {
  const locale = (appConfig.providers as Provider[])
    .map(p => p as { provide?: unknown; useValue?: unknown })
    .find(p => p.provide === LOCALE_ID)?.useValue as string;

  it('usa es-PE como LOCALE_ID, igual que kofix-ejecucion', () => {
    expect(locale).toBe('es-PE');
  });

  it('formatea montos con coma de miles y punto decimal', () => {
    expect(formatNumber(879592, locale, '1.2-2')).toBe('879,592.00');
    expect(formatNumber(104090, locale, '1.0-0')).toBe('104,090');
    expect(formatNumber(4.5, locale, '1.0-1')).toBe('4.5');
  });

  it('mantiene porcentajes y fechas con patrón fijo, con meses peruanos', () => {
    const fecha = new Date(2026, 8, 22, 15, 17);
    expect(formatPercent(0.08, locale, '1.0-0').replace(/\u00a0/g, ' ')).toBe('8 %');
    expect(formatDate(fecha, 'dd/MM/yyyy HH:mm', locale)).toBe('22/09/2026 15:17');
    expect(formatDate(fecha, 'longDate', locale)).toBe('22 de setiembre de 2026');
  });

  it('ningún template fija un locale en los pipes (solo se registran los datos de es-PE)', () => {
    // Un `| date:'MMM yy':'':'es'` con un locale no registrado lanza NG0701 y corta el render
    // de toda la vista (pasó en el cronograma de oa-dashboard al cambiar a es-PE).
    // Códigos de idioma explícitos: un patrón genérico de 2 letras confundiría formatos como date:'dd'.
    const localeFijo = /\|\s*(date|number|percent|currency)\b[^|}]*:\s*'(es|en|pt|fr|de|it)(-[A-Z]{2})?'\s*(\||}})/;
    const infractores = templates(__dirname)
      .flatMap(ruta => readFileSync(ruta, 'utf8').split('\n')
        .map((linea, i) => ({ ruta, linea: i + 1, texto: linea.trim() }))
        .filter(l => localeFijo.test(l.texto)));

    expect(infractores).toEqual([]);
  });
});
