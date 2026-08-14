import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WritableSignal, signal } from '@angular/core';
import { AppLayoutComponent } from './app.layout.component';
import { AuthRepository } from '../domain/repositories/auth.repository';
import { MenuRepository } from '../domain/repositories/menu.repository';
import { User } from '../domain/models/auth/auth.model';
import { of } from 'rxjs';

describe('AppLayoutComponent', () => {
    let component: AppLayoutComponent;
    let fixture: ComponentFixture<AppLayoutComponent>;
    let mockAuthRepo: jest.Mocked<Partial<AuthRepository>>;
    let userSignal: WritableSignal<User | null>;

    const mockUser: User = {
        id: 1,
        name: 'Ana Torres',
        apellidoPaterno: 'Torres',
        email: 'ana@test.com',
        role: 'ESPECIALISTA',
        roles: ['Especialista']
    };

    beforeEach(async () => {
        // jsdom no evalúa media queries; el shell compartido las necesita para detectar modo móvil.
        window.matchMedia = jest.fn().mockImplementation(() => ({
            matches: false,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        })) as unknown as typeof window.matchMedia;

        userSignal = signal<User | null>(mockUser);
        mockAuthRepo = {
            user$: userSignal,
            logout: jest.fn()
        };

        await TestBed.configureTestingModule({
            imports: [AppLayoutComponent],
            providers: [
                provideRouter([]),
                { provide: AuthRepository, useValue: mockAuthRepo },
                { provide: MenuRepository, useValue: { getMenus: jest.fn().mockReturnValue(of([])) } }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(AppLayoutComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create component instance', () => {
        expect(component).toBeTruthy();
    });

    it('should derive user display data from the authenticated user', () => {
        expect(component.userName()).toBe('Ana Torres');
        expect(component.userRole()).toBe('Especialista');
        expect(component.initial()).toBe('A');
    });

    it('should fall back to defaults when there is no user', () => {
        userSignal.set(null);
        fixture.detectChanges();

        expect(component.userName()).toBe('Usuario');
        expect(component.userRole()).toBe('Especialista');
        expect(component.initial()).toBe('U');
    });

    it('should toggle the desktop collapse state', () => {
        expect(component.colapsado()).toBe(false);

        component.toggleColapso();
        expect(component.colapsado()).toBe(true);

        component.toggleColapso();
        expect(component.colapsado()).toBe(false);
    });

    it('should delegate logout to the auth repository', () => {
        component.logout();
        expect(mockAuthRepo.logout).toHaveBeenCalled();
    });
});
