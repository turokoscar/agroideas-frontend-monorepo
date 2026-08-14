import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppMenuComponent } from './app.menu.component';
import { MenuRepository } from '../../domain/repositories/menu.repository';
import { MenuAgrupado } from '../../domain/models/menu/menu.model';
import { of } from 'rxjs';

describe('AppMenuComponent', () => {
    let component: AppMenuComponent;
    let fixture: ComponentFixture<AppMenuComponent>;
    let mockMenuRepo: jest.Mocked<Partial<MenuRepository>>;

    const mockMenus: MenuAgrupado[] = [
        { id: 1, nombre: 'Inicio', icono: 'home', ruta: '/main/home', orden: 1, hijos: [] },
        {
            id: 2,
            nombre: 'Gestión',
            orden: 2,
            hijos: [{ id: 3, nombre: 'Convenios', icono: 'description', ruta: '/main/convenios', orden: 1 }]
        }
    ];

    beforeEach(async () => {
        mockMenuRepo = {
            getMenus: jest.fn().mockReturnValue(of(mockMenus))
        };

        await TestBed.configureTestingModule({
            imports: [AppMenuComponent],
            providers: [provideRouter([]), { provide: MenuRepository, useValue: mockMenuRepo }]
        }).compileComponents();

        fixture = TestBed.createComponent(AppMenuComponent);
        component = fixture.componentInstance;
    });

    it('should create component instance', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('should load menus from the repository on init', () => {
        fixture.detectChanges();

        expect(mockMenuRepo.getMenus).toHaveBeenCalled();
        expect(component.menus()).toEqual(mockMenus);
    });

    it('should render top-level links and grouped children with their labels', () => {
        fixture.detectChanges();
        const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

        expect(texto).toContain('Inicio');
        expect(texto).toContain('Gestión');
        expect(texto).toContain('Convenios');
        expect(fixture.nativeElement.querySelectorAll('a').length).toBe(2);
    });

    it('should hide text labels but keep icons when collapsed', () => {
        fixture.componentRef.setInput('colapsado', true);
        fixture.detectChanges();

        const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(texto).not.toContain('Inicio');
        expect(texto).not.toContain('Convenios');
        expect(fixture.nativeElement.querySelectorAll('span.material-symbols-outlined').length).toBeGreaterThan(0);
    });
});
