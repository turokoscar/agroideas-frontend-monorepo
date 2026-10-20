import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MiCierreComponent } from './mi-cierre.component';
import { CierreApiService } from '../../core/services/cierre-api.service';
import { ExpedienteComponent } from '../expediente/expediente.component';
import { Component, input } from '@angular/core';

@Component({ selector: 'app-expediente', standalone: true, template: 'expediente {{ id() }}' })
class ExpedienteFalsoComponent {
  id = input<string | number>();
  mostrarVolver = input(true);
}

describe('MiCierreComponent', () => {
  const api = { listar: jest.fn() };

  function crear() {
    TestBed.configureTestingModule({
      imports: [MiCierreComponent],
      providers: [provideRouter([]), { provide: CierreApiService, useValue: api }]
    }).overrideComponent(MiCierreComponent, {
      remove: { imports: [ExpedienteComponent] },
      add: { imports: [ExpedienteFalsoComponent] }
    });
    const fixture = TestBed.createComponent(MiCierreComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('muestra el expediente de la OA (la API ya filtra por su convenio)', () => {
    api.listar.mockReturnValue(of({ total: 1, items: [{ ideCierreConvenio: 12 }] }));
    const fixture = crear();
    expect(api.listar).toHaveBeenCalledWith({ pagina: 1, cantidad: 1 });
    expect(fixture.nativeElement.textContent).toContain('expediente 12');
  });

  it('sin expediente explica que se abre con el último RTF', () => {
    api.listar.mockReturnValue(of({ total: 0, items: [] }));
    const fixture = crear();
    expect(fixture.nativeElement.textContent).toContain('se abre al enviar el RTF del último paso crítico');
  });
});
