import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { CronogramaConsolidadoComponent } from './cronograma-consolidado.component';
import { ConvenioRepository } from '../../../domain/repositories/convenio.repository';

describe('CronogramaConsolidadoComponent', () => {
    let component: CronogramaConsolidadoComponent;
    let fixture: ComponentFixture<CronogramaConsolidadoComponent>;
    let mockRepo: jest.Mocked<Partial<ConvenioRepository>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;

    beforeEach(async () => {
        mockRepo = { getCronogramasMensuales: jest.fn().mockReturnValue(of({ cronograma: [] })) };
        mockAlert = { show: jest.fn(), toast: jest.fn() };

        await TestBed.configureTestingModule({
            imports: [CronogramaConsolidadoComponent],
            providers: [
                { provide: ConvenioRepository, useValue: mockRepo },
                { provide: AlertService, useValue: mockAlert }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CronogramaConsolidadoComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('convenioId', 5);

        window.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
        window.URL.revokeObjectURL = jest.fn();
        HTMLAnchorElement.prototype.click = jest.fn();
    });

    it('should default to an empty list when the API returns no cronograma', () => {
        fixture.detectChanges();

        expect(component.items()).toEqual([]);
        expect(component.loading()).toBe(false);
    });

    it('should build a 36-month map per item, filling in the months the backend sent', () => {
        mockRepo.getCronogramasMensuales = jest.fn().mockReturnValue(
            of({
                cronograma: [
                    {
                        itemMlId: 1,
                        descripcion: 'Fertilizante',
                        tipo: 'Bien',
                        montoAprobado: 1000,
                        montoProgramado: 400,
                        meses: [{ mes: 2, metaFisica: 10, metaFinanciera: 400 }]
                    }
                ]
            })
        );

        fixture.detectChanges();

        const [item] = component.items();
        expect(item.id).toBe(1);
        expect(Object.keys(item.meses)).toHaveLength(36);
        expect(item.meses[2]).toEqual({ fisica: 10, financiera: 400 });
        expect(item.meses[1]).toEqual({ fisica: 0, financiera: 0 });
    });

    describe('exportExcel', () => {
        it('should warn instead of exporting when there is no data', () => {
            fixture.detectChanges();

            component.exportExcel();

            expect(mockAlert.show).toHaveBeenCalledWith('Sin Datos', expect.any(String), 'warning');
            expect(window.URL.createObjectURL).not.toHaveBeenCalled();
        });

        it('should trigger the download and confirm completion when there is data', () => {
            mockRepo.getCronogramasMensuales = jest.fn().mockReturnValue(
                of({ cronograma: [{ itemMlId: 1, descripcion: 'Fertilizante', tipo: 'Bien', montoAprobado: 1000, montoProgramado: 400, meses: [] }] })
            );
            fixture.detectChanges();

            component.exportExcel();

            expect(window.URL.createObjectURL).toHaveBeenCalled();
            expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
            expect(mockAlert.toast).toHaveBeenCalledWith('Exportación a Excel completada con éxito.');
        });
    });

    describe('exportPdf', () => {
        it('should warn instead of exporting when there is no data', () => {
            fixture.detectChanges();

            component.exportPdf();

            expect(mockAlert.show).toHaveBeenCalledWith('Sin Datos', expect.any(String), 'warning');
            expect(mockAlert.toast).not.toHaveBeenCalled();
        });
    });

    it('should format currency and show a dash for a falsy value', () => {
        fixture.detectChanges();

        expect(component.formatCurrency(0)).toBe('-');
        expect(component.formatCurrency(undefined)).toBe('-');
        expect(component.formatCurrency(1000)).toContain('1,000');
    });
});
