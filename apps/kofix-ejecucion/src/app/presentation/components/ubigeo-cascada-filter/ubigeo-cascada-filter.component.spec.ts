import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UbigeoCascadaFilterComponent } from './ubigeo-cascada-filter.component';
import { CarteraRepository } from '../../../domain/repositories/cartera.repository';

describe('UbigeoCascadaFilterComponent', () => {
    let component: UbigeoCascadaFilterComponent;
    let fixture: ComponentFixture<UbigeoCascadaFilterComponent>;
    let mockRepo: jest.Mocked<Partial<CarteraRepository>>;

    beforeEach(async () => {
        mockRepo = {
            getUbigeos: jest.fn().mockReturnValue(of([]))
        };

        await TestBed.configureTestingModule({
            imports: [UbigeoCascadaFilterComponent],
            providers: [{ provide: CarteraRepository, useValue: mockRepo }]
        }).compileComponents();

        fixture = TestBed.createComponent(UbigeoCascadaFilterComponent);
        component = fixture.componentInstance;
    });

    it('should load the departamentos catalog on init', () => {
        mockRepo.getUbigeos = jest.fn().mockReturnValue(of([{ codigo: '08', nombre: 'CUSCO' }]));

        fixture.detectChanges();

        expect(mockRepo.getUbigeos).toHaveBeenCalledWith('DEPARTAMENTO');
        expect(component.departamentos()).toEqual([{ codigo: '08', nombre: 'CUSCO' }]);
    });

    it('should load provincias and emit the filter when a departamento is selected', () => {
        fixture.detectChanges();

        mockRepo.getUbigeos = jest.fn().mockReturnValue(of([{ codigo: '0801', nombre: 'CUSCO' }]));
        const emitted: unknown[] = [];
        component.filtroChange.subscribe(v => emitted.push(v));

        component.onDepartamentoChange('08');

        expect(mockRepo.getUbigeos).toHaveBeenCalledWith('PROVINCIA', '08');
        expect(component.provincias()).toEqual([{ codigo: '0801', nombre: 'CUSCO' }]);
        expect(emitted).toEqual([{ departamentoCodigo: '08', provinciaCodigo: undefined, distritoCodigo: undefined }]);
    });

    it('should reset provincia and distrito when the departamento is cleared', () => {
        fixture.detectChanges();

        component.provinciaCodigo.set('0801');
        component.distritoCodigo.set('080101');
        component.provincias.set([{ codigo: '0801', nombre: 'CUSCO' }]);
        component.distritos.set([{ codigo: '080101', nombre: 'CUSCO' }]);

        mockRepo.getUbigeos = jest.fn().mockReturnValue(of([]));
        const emitted: unknown[] = [];
        component.filtroChange.subscribe(v => emitted.push(v));

        component.onDepartamentoChange('');

        expect(mockRepo.getUbigeos).not.toHaveBeenCalled();
        expect(component.provinciaCodigo()).toBe('');
        expect(component.distritoCodigo()).toBe('');
        expect(component.provincias()).toEqual([]);
        expect(component.distritos()).toEqual([]);
        expect(emitted).toEqual([{ departamentoCodigo: undefined, provinciaCodigo: undefined, distritoCodigo: undefined }]);
    });

    it('should load distritos and emit the filter when a provincia is selected', () => {
        mockRepo.getUbigeos = jest.fn().mockReturnValue(of([{ codigo: '080101', nombre: 'CUSCO' }]));
        const emitted: unknown[] = [];
        component.filtroChange.subscribe(v => emitted.push(v));

        component.departamentoCodigo.set('08');
        component.onProvinciaChange('0801');

        expect(mockRepo.getUbigeos).toHaveBeenCalledWith('DISTRITO', '0801');
        expect(component.distritos()).toEqual([{ codigo: '080101', nombre: 'CUSCO' }]);
        expect(emitted).toEqual([{ departamentoCodigo: '08', provinciaCodigo: '0801', distritoCodigo: undefined }]);
    });

    it('should emit the filter when a distrito is selected', () => {
        const emitted: unknown[] = [];
        component.filtroChange.subscribe(v => emitted.push(v));

        component.departamentoCodigo.set('08');
        component.provinciaCodigo.set('0801');
        component.onDistritoChange('080101');

        expect(emitted).toEqual([{ departamentoCodigo: '08', provinciaCodigo: '0801', distritoCodigo: '080101' }]);
    });
});
