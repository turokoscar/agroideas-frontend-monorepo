import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ToastService } from '@agroideas/ui';
import { BandejaComponent, coincide, pestanaInicial } from './bandeja.component';
import { CierreApiService } from '../../core/services/cierre-api.service';
import { AuthService } from '../../core/services/auth.service';
import { ConvenioSelDto, ConvenioSelService } from '../../core/services/convenio-sel.service';
import { CierreRol } from '../../core/models/rol-cierre.model';
import { ExpedientePendienteDto, SemaforoPlazo } from '../../core/models/cierre.model';

function pendiente(ideCierreConvenio: number, tipSemaforo: SemaforoPlazo, extra: Partial<ExpedientePendienteDto> = {}): ExpedientePendienteDto {
  return {
    ideCierreConvenio,
    ideConvenio: 40000 + ideCierreConvenio,
    estCierre: 'EN_EVALUACION_UN',
    fecInicio: '2026-10-01T00:00:00',
    txtNumeroConvenio: `00${ideCierreConvenio}-2026`,
    fecFirmaConvenio: null,
    txtOrganizacion: `Cooperativa ${ideCierreConvenio}`,
    flgDeOficio: false,
    flgSelSincronizado: null,
    tipPlazo: 'EVALUACION_UN',
    fecLimitePlazo: '2026-12-30T23:59:59',
    numDiasRestantes: 10,
    tipSemaforo,
    acciones: ['DerivarDe'],
    ...extra
  };
}

describe('BandejaComponent', () => {
  describe('pestanaInicial', () => {
    it('abre la pestaña más urgente que tenga expedientes', () => {
      expect(pestanaInicial({ VENCIDO: 0, POR_VENCER: 2, EN_PLAZO: 5, SIN_PLAZO: 1 })).toBe('POR_VENCER');
      expect(pestanaInicial({ VENCIDO: 1, POR_VENCER: 2, EN_PLAZO: 5, SIN_PLAZO: 1 })).toBe('VENCIDO');
    });

    it('con la bandeja vacía abre "Todos"', () => {
      expect(pestanaInicial({ VENCIDO: 0, POR_VENCER: 0, EN_PLAZO: 0, SIN_PLAZO: 0 })).toBe('TODOS');
    });
  });

  describe('coincide', () => {
    const exp = pendiente(7, 'EN_PLAZO', { txtOrganizacion: 'Asociación Wishlaj Marca', txtNumeroConvenio: '0051-2026' });

    it('busca por organización, convenio e IDs sin distinguir mayúsculas', () => {
      expect(coincide(exp, 'wishlaj')).toBe(true);
      expect(coincide(exp, '0051')).toBe(true);
      expect(coincide(exp, '40007')).toBe(true);
      expect(coincide(exp, '  ')).toBe(true);
      expect(coincide(exp, 'otra')).toBe(false);
    });

    it('busca por el número de convenio tal como se muestra', () => {
      const delSel = pendiente(8, 'EN_PLAZO', { txtNumeroConvenio: '48', fecFirmaConvenio: '2026-06-23T00:00:00' });
      expect(coincide(delSel, '0048-2026-st')).toBe(true);
      expect(coincide(delSel, '0048-2025')).toBe(false);
    });
  });

  describe('componente', () => {
    const api = {
      listarTodosLosPendientes: jest.fn(),
      listar: jest.fn(),
      iniciar: jest.fn()
    };
    const toast = { error: jest.fn(), success: jest.fn() };
    const convenios = { buscar: jest.fn() };

    function crear(roles: CierreRol[] = ['UN']) {
      TestBed.configureTestingModule({
        imports: [BandejaComponent],
        providers: [
          provideRouter([]),
          { provide: CierreApiService, useValue: api },
          { provide: ToastService, useValue: toast },
          { provide: ConvenioSelService, useValue: convenios },
          { provide: AuthService, useValue: { roles: () => roles } }
        ]
      });
      const fixture = TestBed.createComponent(BandejaComponent);
      fixture.detectChanges();
      return fixture;
    }

    beforeEach(() => jest.clearAllMocks());

    it('cuenta la bandeja por semáforo y abre la pestaña más urgente', () => {
      api.listarTodosLosPendientes.mockReturnValue(
        of([pendiente(1, 'EN_PLAZO'), pendiente(2, 'POR_VENCER'), pendiente(3, 'POR_VENCER'), pendiente(4, 'SIN_PLAZO')])
      );
      const { componentInstance: c } = crear();

      expect(c.conteo()).toEqual({ VENCIDO: 0, POR_VENCER: 2, EN_PLAZO: 1, SIN_PLAZO: 1 });
      expect(c.pestana()).toBe('POR_VENCER');
      expect(c.pendientesVisibles().map(p => p.ideCierreConvenio)).toEqual([2, 3]);
    });

    it('la búsqueda filtra dentro de la pestaña', () => {
      api.listarTodosLosPendientes.mockReturnValue(of([pendiente(1, 'EN_PLAZO'), pendiente(2, 'EN_PLAZO')]));
      const { componentInstance: c } = crear();

      c.busqueda.set('Cooperativa 2');
      expect(c.pendientesVisibles().map(p => p.ideCierreConvenio)).toEqual([2]);
    });

    it('con la bandeja vacía carga "Todos" paginado en el servidor', () => {
      api.listarTodosLosPendientes.mockReturnValue(of([]));
      api.listar.mockReturnValue(of({ total: 45, items: [] }));
      const { componentInstance: c } = crear();

      expect(c.pestana()).toBe('TODOS');
      expect(api.listar).toHaveBeenCalledWith(expect.objectContaining({ pagina: 1, estado: null }));
      expect(c.totalTodos()).toBe(45);

      c.cambiarFiltroEstado('CERRADO');
      expect(api.listar).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 1, estado: 'CERRADO' }));
    });

    it('muestra el error de la API sin el código', () => {
      api.listarTodosLosPendientes.mockReturnValue(
        throwError(() => ({ error: { respuesta: 'ERROR', mensaje: 'CIE_4001:sel-api-general no responde.' } }))
      );
      crear();
      expect(toast.error).toHaveBeenCalledWith('No se pudo cargar la bandeja', 'sel-api-general no responde.');
    });

    it('solo la UN puede iniciar expedientes', () => {
      api.listarTodosLosPendientes.mockReturnValue(of([]));
      api.listar.mockReturnValue(of({ total: 0, items: [] }));
      expect(crear(['UN']).componentInstance.puedeIniciar()).toBe(true);
      TestBed.resetTestingModule();
      expect(crear(['DE', 'UAJ']).componentInstance.puedeIniciar()).toBe(false);
    });

    it('al iniciar un expediente abre su detalle', () => {
      api.listarTodosLosPendientes.mockReturnValue(of([]));
      api.listar.mockReturnValue(of({ total: 0, items: [] }));
      api.iniciar.mockReturnValue(of({ resultado: 'CREADO', mensaje: 'Abierto en EN_VERIFICACION.', cierre: { ideCierreConvenio: 12 } }));
      const { componentInstance: c } = crear();
      const navegar = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      c.convenioElegido.set({ id: 43829, numeroConvenio: '266', ruc: '20608243691', razonSocial: 'Valles Verdes', fechaFirma: '2023-04-03' });
      c.iniciar();

      expect(api.iniciar).toHaveBeenCalledWith(43829);
      expect(toast.success).toHaveBeenCalledWith('Expediente abierto', 'Abierto en EN_VERIFICACION.');
      expect(navegar).toHaveBeenCalledWith(['/expedientes', 12]);
    });

    it('busca el convenio en el SEL con los roles del usuario y lo muestra con el número oficial', () => {
      api.listarTodosLosPendientes.mockReturnValue(of([]));
      api.listar.mockReturnValue(of({ total: 0, items: [] }));
      const encontrado: ConvenioSelDto = { id: 2242, numeroConvenio: '48', ruc: '20605569481', razonSocial: 'Perfiles Coffee', fechaFirma: '2026-06-23T00:00:00' };
      convenios.buscar.mockReturnValue(of([encontrado]));
      const { componentInstance: c } = crear(['UN']);

      c.abrirModalIniciar();
      c.buscarConvenios('perfiles');

      expect(convenios.buscar).toHaveBeenCalledWith('perfiles', ['UN']);
      expect(c.sugerencias()).toEqual([encontrado]);
      expect(c.textoConvenio(encontrado)).toBe('0048-2026-ST · Perfiles Coffee');
    });

    it('si el SEL falla, lo dice en la lista de sugerencias', () => {
      api.listarTodosLosPendientes.mockReturnValue(of([]));
      api.listar.mockReturnValue(of({ total: 0, items: [] }));
      convenios.buscar.mockReturnValue(throwError(() => ({ status: 503 })));
      const { componentInstance: c } = crear();

      c.buscarConvenios('perfiles');

      expect(c.sugerencias()).toEqual([]);
      expect(c.errorBusqueda()).toBeTruthy();
    });
  });
});
