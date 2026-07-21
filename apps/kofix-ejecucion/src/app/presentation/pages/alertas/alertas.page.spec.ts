import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertasPageComponent } from './alertas.page';
import { AlertaRepository } from '../../../domain/repositories/alerta.repository';
import { of } from 'rxjs';
import { AlertaListResponse } from '../../../domain/models/alerta.model';

describe('AlertasPageComponent', () => {
    let component: AlertasPageComponent;
    let fixture: ComponentFixture<AlertasPageComponent>;
    let mockAlertaRepo: jest.Mocked<AlertaRepository>;

    const mockResponse: AlertaListResponse = {
        kpis: {
            kpiFinPlan: 2,
            kpiSinEjecucion: 1,
            kpiVarianzas: 0,
            totalAlertas: 3
        },
        items: [
            {
                id: 1,
                postulanteId: 10,
                tipo: 'FIN_PLAN',
                tipoLabel: 'Fin de Plan',
                fecha: '2026-08-15',
                numeroConvenio: 'CONV-001',
                organizacion: 'Org Test',
                severidad: 'Alta',
                mensaje: 'Proximo a vencer'
            }
        ],
        total: 3
    };

    beforeEach(async () => {
        mockAlertaRepo = {
            getAlertas: jest.fn().mockReturnValue(of(mockResponse))
        } as unknown as jest.Mocked<AlertaRepository>;

        await TestBed.configureTestingModule({
            imports: [AlertasPageComponent],
            providers: [
                { provide: AlertaRepository, useValue: mockAlertaRepo }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(AlertasPageComponent);
        component = fixture.componentInstance;
    });

    it('should create component instance', () => {
        expect(component).toBeTruthy();
    });

    it('should load data and update signals correctly', () => {
        component.loadData();

        expect(mockAlertaRepo.getAlertas).toHaveBeenCalled();
        expect(component.alertas().length).toBe(1);
        expect(component.totalRecords()).toBe(3);
        expect(component.kpis()[0].value).toBe('2');
        expect(component.kpis()[1].value).toBe('1');
    });

    it('should reset page to 1 on filter trigger', () => {
        component.selectedTipoValue.set('FIN_PLAN');
        component.onFilter();

        expect(component.currentPage()).toBe(1);
        expect(mockAlertaRepo.getAlertas).toHaveBeenCalledWith(expect.objectContaining({
            tipo: 'FIN_PLAN'
        }));
    });
});
