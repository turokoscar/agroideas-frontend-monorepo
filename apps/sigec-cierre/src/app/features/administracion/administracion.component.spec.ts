import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ToastService } from '@agroideas/ui';
import { CierreApiService } from '../../core/services/cierre-api.service';
import { FeriadoDto, FeriadoPropuestoDto } from '../../core/models/calendario.model';
import { ParametroDto } from '../../core/models/parametro.model';
import { FeriadosComponent } from './feriados.component';
import { ParametrosComponent } from './parametros.component';

const api = {
  listarFeriados: jest.fn(), crearFeriados: jest.fn(), actualizarFeriado: jest.fn(), desactivarFeriado: jest.fn(),
  proponerFeriadosGobPe: jest.fn(), listarParametros: jest.fn(), actualizarParametro: jest.fn()
};
const toast = { success: jest.fn(), error: jest.fn() };

function configurar() {
  TestBed.configureTestingModule({
    providers: [{ provide: CierreApiService, useValue: api }, { provide: ToastService, useValue: toast }]
  });
}

const feriado: FeriadoDto = {
  ideFeriado: 1, fecDia: '2026-07-28T00:00:00', tipDia: 'FERIADO_NACIONAL', codDepartamento: null, codProvincia: null,
  txtDescripcion: 'Fiestas Patrias', txtSustento: null, tipOrigen: 'GOB_PE', flgActivo: true
};
const propuesta = (txtDescripcion: string, extra: Partial<FeriadoPropuestoDto> = {}): FeriadoPropuestoDto => ({
  fecDia: '2027-01-01T00:00:00', tipDia: 'FERIADO_NACIONAL', codDepartamento: null, nombreDepartamento: null, txtDescripcion,
  txtSustento: null, yaRegistrado: false, revisarAlcance: false, ...extra
});

beforeEach(() => {
  jest.clearAllMocks();
  api.listarFeriados.mockReturnValue(of([feriado]));
});

describe('FeriadosComponent', () => {
  function crear() {
    configurar();
    const fixture = TestBed.createComponent(FeriadosComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('lista los días del año actual', () => {
    const fixture = crear();
    expect(api.listarFeriados).toHaveBeenCalledWith(new Date().getFullYear());
    expect(fixture.nativeElement.textContent).toContain('Fiestas Patrias');
  });

  it('registra un día regional manual con su departamento', () => {
    api.crearFeriados.mockReturnValue(of([]));
    const c = crear().componentInstance;
    c.nuevo();
    const f = c.formulario();
    if (!f) throw new Error('sin formulario');
    Object.assign(f, { fecDia: '2026-08-06', tipDia: 'REGIONAL', txtDescripcion: 'Batalla de Junín' });
    expect(c.errorFormulario()).toContain('departamento');
    f.codDepartamento = '12';
    expect(c.errorFormulario()).toBeNull();
    c.guardar();
    expect(api.crearFeriados).toHaveBeenCalledWith([
      { fecDia: '2026-08-06', tipDia: 'REGIONAL', codDepartamento: '12', codProvincia: null, txtDescripcion: 'Batalla de Junín', txtSustento: null, tipOrigen: 'MANUAL' }
    ]);
    expect(c.formulario()).toBeNull();
  });

  it('edita solo descripción, sustento y alcance', () => {
    api.actualizarFeriado.mockReturnValue(of(feriado));
    const c = crear().componentInstance;
    c.editar(feriado);
    const f = c.formulario();
    if (!f) throw new Error('sin formulario');
    f.txtSustento = 'Ley N° 31788';
    c.guardar();
    expect(api.actualizarFeriado).toHaveBeenCalledWith(1, { codDepartamento: null, codProvincia: null, txtDescripcion: 'Fiestas Patrias', txtSustento: 'Ley N° 31788' });
  });

  it('importa de gob.pe: preselecciona los nuevos sin alcance dudoso y registra los elegidos como GOB_PE', () => {
    api.proponerFeriadosGobPe.mockReturnValue(of([
      propuesta('Año Nuevo'),
      propuesta('Fiestas Patrias', { yaRegistrado: true }),
      propuesta('Batalla de Junín', { tipDia: 'REGIONAL', codDepartamento: '12', revisarAlcance: true })
    ]));
    api.crearFeriados.mockReturnValue(of([]));
    const c = crear().componentInstance;
    c.importar();
    expect(c.seleccionadas().map(p => p.txtDescripcion)).toEqual(['Año Nuevo']);
    c.alternarPropuesta(2);
    c.registrarPropuestas();
    expect(api.crearFeriados).toHaveBeenCalledWith([
      expect.objectContaining({ txtDescripcion: 'Año Nuevo', tipOrigen: 'GOB_PE', fecDia: '2027-01-01' }),
      expect.objectContaining({ txtDescripcion: 'Batalla de Junín', codDepartamento: '12', tipOrigen: 'GOB_PE' })
    ]);
  });

  it('da de baja un día', () => {
    api.desactivarFeriado.mockReturnValue(of({}));
    const c = crear().componentInstance;
    c.aBorrar.set(feriado);
    c.desactivar();
    expect(api.desactivarFeriado).toHaveBeenCalledWith(1);
    expect(c.aBorrar()).toBeNull();
  });
});

describe('ParametrosComponent', () => {
  const parametro = (codParametro: string, txtValor: string): ParametroDto => ({
    codParametro, txtValor, txtDescripcion: codParametro, ideUsuario: null, fecModificacion: '2026-10-01T00:00:00'
  });

  function crear() {
    configurar();
    const fixture = TestBed.createComponent(ParametrosComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => api.listarParametros.mockReturnValue(of([parametro('PLAZO_REVISION_UAJ_DIAS', '20'), parametro('CORREO_UAJ', '')])));

  it('agrupa los parámetros', () => {
    expect(crear().componentInstance.grupos().map(g => g.clave)).toEqual(['plazos', 'correos']);
  });

  it('valida antes de guardar y guarda el valor recortado', () => {
    api.actualizarParametro.mockReturnValue(of(parametro('PLAZO_REVISION_UAJ_DIAS', '25')));
    const c = crear().componentInstance;
    const plazo = c.parametros()[0];
    c.editar(plazo.codParametro, '400');
    expect(c.error(plazo)).toContain('entre 1 y 365');
    c.editar(plazo.codParametro, ' 25 ');
    expect(c.error(plazo)).toBeNull();
    c.guardar(plazo);
    expect(api.actualizarParametro).toHaveBeenCalledWith('PLAZO_REVISION_UAJ_DIAS', '25');
    expect(c.parametros()[0].txtValor).toBe('25');
    expect(c.cambiado(c.parametros()[0])).toBe(false);
  });
});
