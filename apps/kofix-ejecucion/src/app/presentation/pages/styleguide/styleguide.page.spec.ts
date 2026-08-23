import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StyleguidePageComponent } from './styleguide.page';

describe('StyleguidePageComponent', () => {
    let component: StyleguidePageComponent;
    let fixture: ComponentFixture<StyleguidePageComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [StyleguidePageComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(StyleguidePageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should start with the demo modal hidden', () => {
        expect(component.showModal()).toBe(false);
    });

    it('should hide the demo modal after confirming', () => {
        component.showModal.set(true);

        component.handleConfirm();

        expect(component.showModal()).toBe(false);
    });
});
