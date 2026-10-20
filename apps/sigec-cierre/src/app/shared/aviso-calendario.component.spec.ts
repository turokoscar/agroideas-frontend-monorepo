import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CierreApiService } from '../core/services/cierre-api.service';
import { aniosACubrir } from '../core/models/calendario.model';
import { AvisoCalendarioComponent } from './aviso-calendario.component';

describe('aniosACubrir', () => {
  it('incluye el año siguiente solo si el periodo lo alcanza', () => {
    expect(aniosACubrir(120, new Date(2026, 9, 20))).toEqual([2026, 2027]);
    expect(aniosACubrir(120, new Date(2026, 2, 1))).toEqual([2026]);
  });
});

describe('AvisoCalendarioComponent', () => {
  const api = { listarFeriados: jest.fn() };

  function crear(enlace = false) {
    TestBed.configureTestingModule({
      imports: [AvisoCalendarioComponent],
      providers: [provideRouter([]), { provide: CierreApiService, useValue: api }]
    });
    const fixture = TestBed.createComponent(AvisoCalendarioComponent);
    fixture.componentRef.setInput('enlace', enlace);
    fixture.detectChanges();
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 9, 20) });
    jest.clearAllMocks();
  });
  afterEach(() => jest.useRealTimers());

  it('avisa del año sin días inhábiles, con enlace al calendario si se pide', () => {
    api.listarFeriados.mockImplementation((anio: number) => of(anio === 2026 ? [{ ideFeriado: 1 }] : []));
    const fixture = crear(true);
    expect(api.listarFeriados.mock.calls.map(c => c[0])).toEqual([2026, 2027]);
    expect(fixture.componentInstance.aniosSinCalendario()).toEqual([2027]);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('2027');
    expect(el.querySelector('a[href="/administracion"]')).not.toBeNull();
  });

  it('con el calendario cubierto, o si la consulta falla, no muestra nada', () => {
    api.listarFeriados.mockImplementation((anio: number) => (anio === 2026 ? of([{ ideFeriado: 1 }]) : throwError(() => new Error('caída'))));
    const fixture = crear();
    expect(fixture.componentInstance.aniosSinCalendario()).toEqual([]);
    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('');
  });
});
