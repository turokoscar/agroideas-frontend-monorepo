import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginPageComponent } from './login.page';
import { AuthRepository } from '../../../domain/repositories/auth.repository';

describe('LoginPageComponent', () => {
    let component: LoginPageComponent;
    let fixture: ComponentFixture<LoginPageComponent>;
    let mockAuthRepo: jest.Mocked<Partial<AuthRepository>>;
    let router: Router;

    beforeEach(async () => {
        mockAuthRepo = { login: jest.fn() };

        await TestBed.configureTestingModule({
            imports: [LoginPageComponent],
            providers: [provideRouter([]), { provide: AuthRepository, useValue: mockAuthRepo }]
        }).compileComponents();

        fixture = TestBed.createComponent(LoginPageComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        jest.spyOn(router, 'navigate').mockResolvedValue(true);
    });

    it('should navigate to /main on a successful login', () => {
        mockAuthRepo.login = jest.fn().mockReturnValue(of({ exitoso: true }));

        component.handleLogin({ usuario: 'ana', clave: '123' });

        expect(router.navigate).toHaveBeenCalledWith(['/main']);
        expect(component.loading()).toBe(false);
        expect(component.errorMessage()).toBe('');
    });

    it('should show the server message and stay on the page when credentials are rejected', () => {
        mockAuthRepo.login = jest.fn().mockReturnValue(of({ exitoso: false, mensaje: 'Credenciales inválidas' }));

        component.handleLogin({ usuario: 'ana', clave: 'bad' });

        expect(router.navigate).not.toHaveBeenCalled();
        expect(component.errorMessage()).toBe('Credenciales inválidas');
        expect(component.loading()).toBe(false);
    });

    it('should fall back to a generic message when the rejection has none', () => {
        mockAuthRepo.login = jest.fn().mockReturnValue(of({ exitoso: false }));

        component.handleLogin({ usuario: 'ana', clave: 'bad' });

        expect(component.errorMessage()).toBe('Credenciales inválidas');
    });

    it('should show a connectivity message when the request errors out', () => {
        mockAuthRepo.login = jest.fn().mockReturnValue(throwError(() => new Error('network down')));

        component.handleLogin({ usuario: 'ana', clave: '123' });

        expect(component.errorMessage()).toBe('No se pudo conectar con el servidor de seguridad');
        expect(component.loading()).toBe(false);
    });
});
