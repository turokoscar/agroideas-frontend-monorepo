import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiAutocompleteComponent } from './ui-autocomplete.component';

interface Convenio {
  id: number;
  nombre: string;
}

describe('UiAutocompleteComponent', () => {
  let fixture: ComponentFixture<UiAutocompleteComponent<Convenio>>;
  let componente: UiAutocompleteComponent<Convenio>;
  let busquedas: string[];
  let elegidos: (Convenio | null)[];

  const opciones: Convenio[] = [
    { id: 1, nombre: 'Cooperativa Café Sur' },
    { id: 2, nombre: 'Asociación Valle Verde' }
  ];

  const campo = (): HTMLInputElement => fixture.nativeElement.querySelector('input');
  const escribir = (valor: string) => {
    campo().dispatchEvent(new Event('focus'));
    campo().value = valor;
    campo().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const tecla = (key: string) => {
    campo().dispatchEvent(new KeyboardEvent('keydown', { key }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    jest.useFakeTimers();
    fixture = TestBed.createComponent(UiAutocompleteComponent<Convenio>);
    componente = fixture.componentInstance;
    fixture.componentRef.setInput('displayWith', (c: Convenio) => c.nombre);
    fixture.componentRef.setInput('minLength', 2);
    fixture.componentRef.setInput('debounceMs', 300);
    busquedas = [];
    elegidos = [];
    componente.search.subscribe(t => busquedas.push(t));
    componente.optionSelected.subscribe(c => elegidos.push(c));
    fixture.detectChanges();
  });

  afterEach(() => jest.useRealTimers());

  it('busca tras la espera, con el término recortado y solo desde la longitud mínima', () => {
    escribir('c');
    jest.advanceTimersByTime(300);
    expect(busquedas).toEqual([]);

    escribir(' ca');
    escribir(' caf ');
    jest.advanceTimersByTime(299);
    expect(busquedas).toEqual([]);
    jest.advanceTimersByTime(1);
    expect(busquedas).toEqual(['caf']);
  });

  it('muestra las sugerencias como combobox accesible y elige con el teclado', () => {
    escribir('ca');
    fixture.componentRef.setInput('options', opciones);
    fixture.detectChanges();

    expect(campo().getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('[role="option"]').length).toBe(2);

    tecla('ArrowDown');
    tecla('ArrowDown');
    expect(campo().getAttribute('aria-activedescendant')).toContain('-1');
    tecla('Enter');

    expect(elegidos).toEqual([opciones[1]]);
    expect(campo().value).toBe('Asociación Valle Verde');
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  it('elige con el clic y anula la selección si se vuelve a escribir', () => {
    escribir('co');
    fixture.componentRef.setInput('options', opciones);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[role="option"]') as HTMLElement).click();
    fixture.detectChanges();
    expect(elegidos).toEqual([opciones[0]]);

    escribir('Cooperativa');
    expect(elegidos).toEqual([opciones[0], null]);
  });

  it('avisa cuando no hay resultados y mientras busca', () => {
    escribir('zz');
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Buscando');

    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('emptyMessage', 'Ningún convenio coincide.');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ningún convenio coincide.');
  });

  it('Escape cierra la lista y clear() vacía el campo', () => {
    escribir('ca');
    tecla('Escape');
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();

    componente.clear();
    fixture.detectChanges();
    expect(campo().value).toBe('');
  });
});
