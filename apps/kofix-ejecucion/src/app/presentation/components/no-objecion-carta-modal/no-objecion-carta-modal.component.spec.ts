import { AlertService } from '@agroideas/feedback';
import { PermissionService } from '@agroideas/security';
import { PERMISSIONS } from '@agroideas/utils';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CartaNoObjecion } from '../../../domain/models/carta-no-objecion.model';
import { CartaNoObjecionRepository } from '../../../domain/repositories/carta-no-objecion.repository';
import { NoObjecionCartaModalComponent } from './no-objecion-carta-modal.component';

describe('NoObjecionCartaModalComponent', () => {
    let fixture: ComponentFixture<NoObjecionCartaModalComponent>;
    let component: NoObjecionCartaModalComponent;
    let repo: Record<string, jest.Mock>;
    let alert: Record<string, jest.Mock>;
    let permisos: string[];

    const borrador: CartaNoObjecion = {
        id: 7, estado: 'BORRADOR', estadoNoObjecion: 'APROBADO', destinatario: 'REP', cargoDestinatario: 'Presidente',
        ubigeo: 'PUNO', fechaGenerada: '2026-11-24T10:00:00'
    };

    async function crear(carta: CartaNoObjecion): Promise<void> {
        repo['get'].mockReturnValue(of(carta));
        await TestBed.configureTestingModule({
            imports: [NoObjecionCartaModalComponent],
            providers: [
                { provide: CartaNoObjecionRepository, useValue: repo },
                { provide: AlertService, useValue: alert },
                { provide: PermissionService, useValue: { hasPermission: (p: string) => permisos.includes(p) } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(NoObjecionCartaModalComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('noObjecionId', 6);
        await component.cargar();
    }

    beforeEach(() => {
        permisos = [PERMISSIONS.OPERACIONES_FINANCIERAS];
        alert = { show: jest.fn(), confirm: jest.fn().mockResolvedValue({ isConfirmed: true }) };
        repo = {
            get: jest.fn(), getHistorial: jest.fn().mockReturnValue(of([])), guardar: jest.fn().mockReturnValue(of(undefined)),
            generar: jest.fn().mockReturnValue(of(new Blob())), subir: jest.fn().mockReturnValue(of({ fileUrl: 'guid' })),
            emitir: jest.fn().mockReturnValue(of({})), anular: jest.fn().mockReturnValue(of({}))
        };
        URL.createObjectURL = jest.fn().mockReturnValue('blob:x');
        URL.revokeObjectURL = jest.fn();
        jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    });

    afterEach(() => jest.restoreAllMocks());

    it('guarda antes de generar solo si cambió algo', async () => {
        await crear(borrador);
        await component.generar();
        expect(repo['guardar']).not.toHaveBeenCalled();

        component.destinatario.set('OTRO');
        await component.generar();
        expect(repo['guardar']).toHaveBeenCalledWith(6, { destinatario: 'OTRO', cargoDestinatario: 'Presidente', ubigeo: 'PUNO' });
        expect(repo['generar']).toHaveBeenCalledTimes(2);
    });

    it('si se edita después de generar, no deja emitir', async () => {
        await crear(borrador);
        component.numero.set('010-2026');
        component.fecha.set('2026-11-24');
        component.archivo.set(new File(['x'], 'c.pdf', { type: 'application/pdf' }));
        expect(component.puedeEmitir()).toBe(true);

        component.ubigeo.set('CUSCO');
        expect(component.puedeEmitir()).toBe(false);
    });

    it('emite con el identificador del PDF subido y avisa el cambio', async () => {
        await crear(borrador);
        const cerrado = jest.fn();
        component.closed.subscribe(cerrado);
        component.numero.set(' 010-2026 ');
        component.fecha.set('2026-11-24');
        component.archivo.set(new File(['x'], 'c.pdf', { type: 'application/pdf' }));
        await component.emitir();

        expect(repo['emitir']).toHaveBeenCalledWith(6, { numero: '010-2026', fecha: '2026-11-24', ideArchivo: 'guid' });
        expect(cerrado).toHaveBeenCalledWith(true);
    });

    it('solo el supervisor anula, con justificación y advirtiendo los desembolsos', async () => {
        await crear({ ...borrador, estado: 'EMITIDA' });
        expect(component.puedeAnular()).toBe(false);
        expect(component.puedeElaborar()).toBe(false);

        permisos = [PERMISSIONS.SUPERVISOR];
        TestBed.resetTestingModule();
        await crear({ ...borrador, estado: 'EMITIDA' });
        fixture.componentRef.setInput('numSolicitudes', 2);
        expect(component.puedeAnular()).toBe(true);
        await component.anular();
        expect(repo['anular']).not.toHaveBeenCalled();

        component.justificacion.set('Error');
        await component.anular();
        expect(alert['confirm'].mock.calls[0][1]).toContain('2 solicitud(es)');
        expect(repo['anular']).toHaveBeenCalledWith(6, 'Error');
    });

    it('muestra el mensaje de la API al fallar la generación', async () => {
        await crear(borrador);
        const cuerpo = new Blob();
        cuerpo.text = () => Promise.resolve('{"mensaje":"Los montos no coinciden"}');
        repo['generar'].mockReturnValue(throwError(() => ({ error: cuerpo })));
        await component.generar();

        expect(alert['show']).toHaveBeenCalledWith('Error', 'Los montos no coinciden', 'error');
    });
});
