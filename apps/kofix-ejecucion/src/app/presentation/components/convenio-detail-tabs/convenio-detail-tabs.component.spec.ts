import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConvenioDetailTabsComponent } from './convenio-detail-tabs.component';

describe('ConvenioDetailTabsComponent', () => {
    let component: ConvenioDetailTabsComponent;
    let fixture: ComponentFixture<ConvenioDetailTabsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ConvenioDetailTabsComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(ConvenioDetailTabsComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('tabs', [
            { label: 'Ficha Técnica' },
            { label: 'No Objeciones', disabled: true }
        ]);
        fixture.componentRef.setInput('activeIndex', 0);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should emit tabChange when selecting an enabled tab', () => {
        const spy = jest.fn();
        component.tabChange.subscribe(spy);

        component.select(0, false);

        expect(spy).toHaveBeenCalledWith(0);
    });

    it('should not emit tabChange when the tab is disabled', () => {
        const spy = jest.fn();
        component.tabChange.subscribe(spy);

        component.select(1, true);

        expect(spy).not.toHaveBeenCalled();
    });
});
