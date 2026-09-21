import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { LoginComponent, STORAGE_KEY_REMEMBERED_USER } from './login.component';
import { AuthService } from '../../core/services/auth.service';

describe('LoginComponent (ADR-0015)', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceMock: {
    login: jest.Mock;
    user: ReturnType<typeof signal>;
  };
  let routerMock: {
    navigate: jest.Mock;
  };

  beforeEach(async () => {
    localStorage.clear();

    authServiceMock = {
      login: jest.fn(),
      user: signal<{ role: string } | null>(null)
    };

    routerMock = {
      navigate: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Inicialización y Configuración Inicial', () => {
    it('debe inicializarse con el tab postulante seleccionado por defecto', () => {
      expect(component.selectedTab()).toBe('postulante');
      expect(component.identityLabel()).toBe('RUC de la Organización');
      expect(component.identityMaxLength()).toBe(11);
      expect(component.showPassword()).toBe(false);
      expect(component.loading()).toBe(false);
      expect(component.errorMessage()).toBeNull();
    });

    it('debe cargar el usuario guardado si existe en localStorage', () => {
      localStorage.setItem(STORAGE_KEY_REMEMBERED_USER, '20601234567');

      const fixtureWithStorage = TestBed.createComponent(LoginComponent);
      const compWithStorage = fixtureWithStorage.componentInstance;
      fixtureWithStorage.detectChanges();

      expect(compWithStorage.username).toBe('20601234567');
      expect(compWithStorage.rememberMe()).toBe(true);
      expect(compWithStorage.selectedTab()).toBe('postulante');
    });

    it('debe seleccionar el tab personal si el usuario guardado no es un RUC de 11 dígitos', () => {
      localStorage.setItem(STORAGE_KEY_REMEMBERED_USER, 'evaluador.un');

      const fixtureWithStorage = TestBed.createComponent(LoginComponent);
      const compWithStorage = fixtureWithStorage.componentInstance;
      fixtureWithStorage.detectChanges();

      expect(compWithStorage.username).toBe('evaluador.un');
      expect(compWithStorage.rememberMe()).toBe(true);
      expect(compWithStorage.selectedTab()).toBe('personal');
    });
  });

  describe('Selector de Roles y Pestañas (Tabs)', () => {
    it('debe cambiar de tab y actualizar los textos computados', () => {
      component.switchTab('personal');

      expect(component.selectedTab()).toBe('personal');
      expect(component.identityLabel()).toBe('DNI o Correo Institucional');
      expect(component.identityPlaceholder()).toBe('usuario@agroideas.gob.pe o DNI');
      expect(component.identityMaxLength()).toBe(40);
      expect(component.identityHelper()).toContain('Acceso exclusivo para evaluadores');
    });

    it('debe limpiar el mensaje de error al cambiar de tab', () => {
      component.errorMessage.set('Error previo');
      component.switchTab('personal');
      expect(component.errorMessage()).toBeNull();
    });
  });

  describe('Visibilidad de Contraseña', () => {
    it('debe alternar la visibilidad al invocar togglePasswordVisibility', () => {
      expect(component.showPassword()).toBe(false);

      component.togglePasswordVisibility();
      expect(component.showPassword()).toBe(true);

      component.togglePasswordVisibility();
      expect(component.showPassword()).toBe(false);
    });
  });

  describe('Validación de RUC y Envío de Formulario', () => {
    it('no debe hacer submit si los campos requeridos están vacíos', () => {
      component.username = '';
      component.password = '';
      component.onSubmit();

      expect(authServiceMock.login).not.toHaveBeenCalled();
    });

    it('debe rechazar un RUC que no tenga 11 dígitos numéricos en modo postulante', () => {
      component.selectedTab.set('postulante');
      component.username = '2060123';
      component.password = 'password123';

      component.onSubmit();

      expect(component.errorMessage()).toBe('El RUC debe constar de 11 dígitos numéricos.');
      expect(authServiceMock.login).not.toHaveBeenCalled();
    });

    it('debe permitir usuarios de texto o DNI en modo personal sin exigir 11 dígitos', () => {
      component.selectedTab.set('personal');
      component.username = 'evaluador.midagri';
      component.password = 'claveSegura123';

      authServiceMock.login.mockReturnValue(of({ success: true }));
      authServiceMock.user.set({ role: 'UN' });

      component.onSubmit();

      expect(authServiceMock.login).toHaveBeenCalledWith('evaluador.midagri', 'claveSegura123');
      expect(routerMock.navigate).toHaveBeenCalledWith(['/rtf/evaluacion-gabinete']);
    });
  });

  describe('Flujos de Autenticación y Redirección por Rol', () => {
    it('debe redirigir al dashboard de postulante cuando el rol es POSTULANTE', () => {
      component.username = '20605569481';
      component.password = 'secret';

      authServiceMock.login.mockReturnValue(of({ success: true }));
      authServiceMock.user.set({ role: 'POSTULANTE' });

      component.onSubmit();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/rtf/dashboard']);
    });

    it('debe redirigir al panel de administración cuando el rol es ADMIN', () => {
      component.switchTab('personal');
      component.username = 'admin.sistema';
      component.password = 'secret';

      authServiceMock.login.mockReturnValue(of({ success: true }));
      authServiceMock.user.set({ role: 'ADMIN' });

      component.onSubmit();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/rtf/admin']);
    });

    it('debe recordar el usuario en localStorage cuando rememberMe es true', () => {
      component.username = '20605569481';
      component.password = 'secret';
      component.rememberMe.set(true);

      authServiceMock.login.mockReturnValue(of({ success: true }));
      authServiceMock.user.set({ role: 'POSTULANTE' });

      component.onSubmit();

      expect(localStorage.getItem(STORAGE_KEY_REMEMBERED_USER)).toBe('20605569481');
    });

    it('debe eliminar el usuario de localStorage cuando rememberMe es false', () => {
      localStorage.setItem(STORAGE_KEY_REMEMBERED_USER, 'antiguo_usuario');

      component.username = '20605569481';
      component.password = 'secret';
      component.rememberMe.set(false);

      authServiceMock.login.mockReturnValue(of({ success: true }));
      authServiceMock.user.set({ role: 'POSTULANTE' });

      component.onSubmit();

      expect(localStorage.getItem(STORAGE_KEY_REMEMBERED_USER)).toBeNull();
    });

    it('debe mostrar mensaje de error cuando las credenciales no son válidas', () => {
      component.username = '20605569481';
      component.password = 'incorrecta';

      authServiceMock.login.mockReturnValue(of({ success: false, mensaje: 'Credenciales inválidas' }));

      component.onSubmit();

      expect(component.loading()).toBe(false);
      expect(component.errorMessage()).toBe('Credenciales inválidas');
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('debe capturar errores HTTP y mostrar mensaje amigable', () => {
      component.username = '20605569481';
      component.password = 'secret';

      authServiceMock.login.mockReturnValue(throwError(() => ({
        error: { mensaje: 'Servicio de seguridad no disponible' }
      })));

      component.onSubmit();

      expect(component.loading()).toBe(false);
      expect(component.errorMessage()).toBe('Servicio de seguridad no disponible');
    });
  });
});
