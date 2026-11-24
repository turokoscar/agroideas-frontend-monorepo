import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { AlertService } from '@agroideas/feedback';
import { of, throwError } from 'rxjs';
import { EvaluacionDetalle } from '../../../domain/models/evaluacion-no-objecion.model';
import { EvaluacionNoObjecionRepository } from '../../../domain/repositories/evaluacion-no-objecion.repository';
import { NoObjecionRepository } from '../../../domain/repositories/no-objecion.repository';
import { EvaluacionNoObjecionPageComponent } from './evaluacion-no-objecion.page';

describe('EvaluacionNoObjecionPageComponent', () => {
    let fixture: ComponentFixture<EvaluacionNoObjecionPageComponent>;
    let component: EvaluacionNoObjecionPageComponent;
    let repo: any;
    let alerta: any;

    const detalle = (extra: any = {}): EvaluacionDetalle => ({
        evaluacion: {
            id: 7, postulanteId: 5, estado: 'BORRADOR', editable: true, version: 1,
            items: [{ itemMlId: 10, cantidad: 1, resultado: null }],
            cotizaciones: [{ ruc: '20440983261', razonSocial: 'A', verificado: true, estadoSunat: 'ACTIVO', condicionSunat: 'HABIDO', precios: [{ itemMlId: 10, precioUnitario: 100, cumple: true, adjudicado: false }] }],
            ...extra
        },
        items: [{ itemMlId: 10, orden: 1, nombre: 'Moto', cantidad: 1, porcentajeAgroideas: 70, rucSugerido: '20440983261' }],
        pendientes: []
    });

    beforeEach(async () => {
        repo = {
            get: jest.fn().mockImplementation(() => of(detalle())),
            getPropuestas: jest.fn().mockReturnValue(of({ planNegocio: 'Plan', razonSocial: 'OA' })),
            guardar: jest.fn().mockReturnValue(of(2)),
            generarInforme: jest.fn(), enviar: jest.fn(), subirInforme: jest.fn()
        };
        alerta = { show: jest.fn(), toast: jest.fn(), confirm: jest.fn().mockResolvedValue({ isConfirmed: true }) };
        await TestBed.configureTestingModule({
            imports: [EvaluacionNoObjecionPageComponent],
            providers: [
                { provide: EvaluacionNoObjecionRepository, useValue: repo },
                { provide: NoObjecionRepository, useValue: { getProgrammedItemsWithBalance: () => of([]) } },
                { provide: AlertService, useValue: alerta },
                { provide: Router, useValue: { navigate: jest.fn() } },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5', evaluacionId: '7' }) } } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(EvaluacionNoObjecionPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should render every step', () => {
        for (const p of component.pasos) {
            component.paso.set(p.id);
            fixture.detectChanges();
        }
        expect(fixture.nativeElement.textContent).toContain('La evaluación está completa');
    });

    it('should save once after the specialist stops typing and keep the new version', fakeAsync(() => {
        component.cambio();
        tick(500);
        component.cambio();
        tick(EvaluacionNoObjecionPageComponent.ESPERA_GUARDADO);
        flush();

        expect(repo.guardar).toHaveBeenCalledTimes(1);
        expect(component.evaluacion()?.version).toBe(2);
        expect(component.pendienteGuardar()).toBe(false);
    }));

    it('should keep the changes pending and show the API message when saving fails', async () => {
        repo.guardar.mockReturnValue(throwError(() => ({ error: { mensaje: 'Otro usuario modificó esta evaluación.' } })));
        component.cambio();

        expect(await component.guardar()).toBe(false);
        expect(component.pendienteGuardar()).toBe(true);
        expect(component.errorGuardado()).toContain('Otro usuario');
    });

    it('should not save a read-only evaluation', fakeAsync(() => {
        component.evaluacion.set(detalle({ editable: false, estado: 'PENDIENTE' }).evaluacion);
        component.cambio();
        flush();
        expect(repo.guardar).not.toHaveBeenCalled();
    }));

    it('should adjudicate the suggested provider only where there is no result', () => {
        component.adjudicarSugeridos();
        expect(component.evaluacion()?.items[0].resultado).toBe('VALIDADO');
        expect(component.ofertas(10)[0].precio.adjudicado).toBe(true);

        component.cambioResultado(10, 'NO_VALIDADO');
        component.adjudicarSugeridos();
        expect(component.evaluacion()?.items[0].resultado).toBe('NO_VALIDADO');
        expect(component.ofertas(10)[0].precio.adjudicado).toBe(false);
    });

    it('should discard SUNAT data when the RUC changes and detect repeated sheets', () => {
        const hoja = component.evaluacion()!.cotizaciones[0];
        component.agregarHoja();
        const nueva = component.hoja()!;
        component.cambioRuc(nueva, '2044-0983261');
        expect(component.rucRepetido(nueva)).toBe(true);

        component.cambioRuc(hoja, '20480297289');
        expect(hoja.razonSocial).toBeNull();
        expect(hoja.verificado).toBeUndefined();
    });

    it('should not mark compliance by default and apply it to the whole sheet on demand', () => {
        const hoja = component.evaluacion()!.cotizaciones[0];
        hoja.precios[0].cumple = null;
        component.aplicarCumple(hoja, true);
        expect(hoja.precios[0].cumple).toBe(true);
    });

    it('should propose the assigned specialist as evaluator without replacing another one', () => {
        repo.getPropuestas.mockReturnValue(of({ especialista: 'ESPECIALISTA' }));
        component.ngOnInit();
        expect(component.evaluacion()?.evaluador).toBe('ESPECIALISTA');

        repo.get.mockReturnValue(of(detalle({ evaluador: 'OTRO' })));
        component.ngOnInit();
        expect(component.evaluacion()?.evaluador).toBe('OTRO');
    });

    it('should only send with a current report, its number, date and PDF', async () => {
        expect(component.puedeEnviar()).toBe(false);
        component.evaluacion()!.versionInforme = 1;
        component.numeroInforme = ' 166-2026 ';
        component.fechaInforme = '2026-07-10';
        component.archivoInforme.set(new File(['x'], 'i.pdf', { type: 'application/pdf' }));
        expect(component.puedeEnviar()).toBe(true);
        repo.subirInforme.mockReturnValue(of({ fileUrl: 'guid' }));
        repo.enviar.mockReturnValue(of({ mensaje: 'ok' }));

        await component.enviar();

        expect(repo.enviar).toHaveBeenCalledWith(7, { version: 1, numeroInforme: '166-2026', fechaInforme: '2026-07-10', ideArchivo: 'guid' });
    });
});
