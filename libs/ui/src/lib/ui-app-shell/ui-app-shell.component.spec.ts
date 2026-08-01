import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { UiAppShellComponent } from './ui-app-shell.component';

@Component({
    standalone: true,
    imports: [UiAppShellComponent],
    template: `
        <app-ui-app-shell>
            <div shell-brand>Marca</div>
            <nav shell-nav>Navegación</nav>
            <div shell-user>Usuario</div>
            <div shell-header>Cabecera</div>
            <p>Contenido</p>
        </app-ui-app-shell>
    `
})
class AnfitrionComponent {}

describe('UiAppShellComponent', () => {
    let fixture: ComponentFixture<AnfitrionComponent>;
    let eventosRouter: Subject<NavigationEnd>;

    /** Fuerza el modo móvil: jsdom no evalúa media queries. */
    const simularAncho = (esMovil: boolean) => {
        window.matchMedia = jest.fn().mockImplementation(() => ({
            matches: esMovil,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        }));
    };

    const shell = () => fixture.debugElement.children[0].componentInstance as UiAppShellComponent;
    const boton = (): HTMLButtonElement | null => fixture.nativeElement.querySelector('button[aria-controls]');
    const backdrop = () => fixture.nativeElement.querySelector('div.fixed.inset-0');

    const crear = (esMovil = true) => {
        simularAncho(esMovil);
        eventosRouter = new Subject<NavigationEnd>();

        TestBed.configureTestingModule({
            imports: [AnfitrionComponent],
            providers: [{ provide: Router, useValue: { events: eventosRouter.asObservable() } }]
        });

        fixture = TestBed.createComponent(AnfitrionComponent);
        fixture.detectChanges();
    };

    afterEach(() => TestBed.resetTestingModule());

    it('proyecta los slots de la app', () => {
        crear();
        const texto = fixture.nativeElement.textContent;
        expect(texto).toContain('Marca');
        expect(texto).toContain('Navegación');
        expect(texto).toContain('Usuario');
        expect(texto).toContain('Cabecera');
        expect(texto).toContain('Contenido');
    });

    it('arranca con el menú cerrado y sin backdrop', () => {
        crear();
        expect(shell().menuAbierto()).toBe(false);
        expect(backdrop()).toBeNull();
        expect(boton()?.getAttribute('aria-expanded')).toBe('false');
    });

    it('abre y cierra el menú con el botón', () => {
        crear();

        boton()?.click();
        fixture.detectChanges();
        expect(shell().menuAbierto()).toBe(true);
        expect(backdrop()).not.toBeNull();
        expect(boton()?.getAttribute('aria-expanded')).toBe('true');

        boton()?.click();
        fixture.detectChanges();
        expect(shell().menuAbierto()).toBe(false);
    });

    it('cierra el menú al completar una navegación', () => {
        crear();
        shell().alternarMenu();
        fixture.detectChanges();

        eventosRouter.next(new NavigationEnd(1, '/rtf/dashboard', '/rtf/dashboard'));
        fixture.detectChanges();

        expect(shell().menuAbierto()).toBe(false);
    });

    it('cierra el menú al pulsar Escape', () => {
        crear();
        shell().alternarMenu();
        fixture.detectChanges();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        fixture.detectChanges();

        expect(shell().menuAbierto()).toBe(false);
    });

    it('en escritorio el menú no está desplegado y el botón queda oculto por CSS', () => {
        crear(false);
        expect(shell().esMovil()).toBe(false);
        expect(shell().menuAbierto()).toBe(false);
        expect(boton()?.className).toContain('md:hidden');
    });
});
