import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UIButtonComponent } from './ui-button.component';

describe('UIButtonComponent', () => {
    let fixture: ComponentFixture<UIButtonComponent>;
    let component: UIButtonComponent;

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [UIButtonComponent] });
        fixture = TestBed.createComponent(UIButtonComponent);
        component = fixture.componentInstance;
    });

    it('por defecto: solid primary, tamaño md', () => {
        const cls = component.buttonClasses();
        expect(cls).toContain('bg-primary');
        expect(cls).toContain('px-6');
        expect(cls).toContain('rounded-xl');
    });

    it('appearance soft + severity warning aplica tinte y hover scale', () => {
        fixture.componentRef.setInput('appearance', 'soft');
        fixture.componentRef.setInput('severity', 'warning');
        const cls = component.buttonClasses();
        expect(cls).toContain('bg-amber-500/10');
        expect(cls).toContain('hover:scale-105');
    });

    it('iconOnly + size sm produce botón cuadrado pequeño', () => {
        fixture.componentRef.setInput('iconOnly', true);
        fixture.componentRef.setInput('size', 'sm');
        const cls = component.buttonClasses();
        expect(cls).toContain('w-8');
        expect(cls).toContain('h-8');
        expect(cls).not.toContain('px-6');
    });

    it('severities legacy outline/ghost siguen funcionando', () => {
        fixture.componentRef.setInput('severity', 'outline');
        expect(component.buttonClasses()).toContain('border-primary');
        fixture.componentRef.setInput('severity', 'ghost');
        expect(component.buttonClasses()).toContain('hover:bg-slate-100');
    });

    it('iconOnly se coacciona como atributo booleano', () => {
        fixture.componentRef.setInput('iconOnly', '');
        expect(component.iconOnly()).toBe(true);
    });

    it('onClick emite al hacer click', () => {
        fixture.detectChanges();
        const spy = jest.fn();
        component.onClick.subscribe(spy);
        (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
        expect(spy).toHaveBeenCalled();
    });

    it('queda deshabilitado mientras loading', () => {
        fixture.componentRef.setInput('loading', true);
        fixture.detectChanges();
        expect((fixture.nativeElement.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    });
});
