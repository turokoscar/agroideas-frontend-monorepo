import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiDataTableComponent } from './ui-data-table.component';

describe('UiDataTableComponent', () => {
    let fixture: ComponentFixture<UiDataTableComponent>;
    let component: UiDataTableComponent;

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [UiDataTableComponent] });
        fixture = TestBed.createComponent(UiDataTableComponent);
        component = fixture.componentInstance;
    });

    describe('displayData', () => {
        it('paginates client-side when not lazy', () => {
            component.data = [1, 2, 3, 4, 5];
            component.lazy = false;
            component.rows = 2;
            component.first = 2;

            expect(component.displayData).toEqual([3, 4]);
        });

        it('returns the raw data as-is when lazy (server already paginated it)', () => {
            component.data = [1, 2, 3];
            component.lazy = true;

            expect(component.displayData).toEqual([1, 2, 3]);
        });
    });

    describe('selector de tamaño de página (ADR-019 Fase 3.5)', () => {
        it('does not render the selector by default (rowsOptions null)', () => {
            component.data = [1, 2, 3];
            component.totalRecords = 3;
            component.paginator = true;
            fixture.detectChanges();

            const select = fixture.nativeElement.querySelector('#dt-page-size-select');
            expect(select).toBeNull();
        });

        it('renders one option per entry in rowsOptions when provided', () => {
            component.data = [1, 2, 3];
            component.totalRecords = 3;
            component.paginator = true;
            component.rowsOptions = [5, 10, 20, 50, 100];
            fixture.detectChanges();

            const options = fixture.nativeElement.querySelectorAll('#dt-page-size-select option');
            expect(options.length).toBe(5);
            expect(options[0].textContent.trim()).toBe('5');
            expect(options[4].textContent.trim()).toBe('100');
        });

        it('updates rows, resets to the first page, and emits rowsChange + onLazyLoad on change', () => {
            component.rows = 10;
            component.first = 20;
            const rowsChangeSpy = jest.fn();
            const lazyLoadSpy = jest.fn();
            component.rowsChange.subscribe(rowsChangeSpy);
            component.onLazyLoad.subscribe(lazyLoadSpy);

            component.onRowsSelectChange({ target: { value: '50' } } as unknown as Event);

            expect(component.rows).toBe(50);
            expect(component.first).toBe(0);
            expect(rowsChangeSpy).toHaveBeenCalledWith(50);
            expect(lazyLoadSpy).toHaveBeenCalledWith({ first: 0, rows: 50 });
        });

        it('does nothing when the selected value matches the current rows', () => {
            component.rows = 10;
            const rowsChangeSpy = jest.fn();
            component.rowsChange.subscribe(rowsChangeSpy);

            component.onRowsSelectChange({ target: { value: '10' } } as unknown as Event);

            expect(rowsChangeSpy).not.toHaveBeenCalled();
        });
    });
});
