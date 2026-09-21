import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginFormComponent, STORAGE_KEY_KOFIX_USER } from './login-form.component';

describe('LoginFormComponent', () => {
    let component: LoginFormComponent;
    let fixture: ComponentFixture<LoginFormComponent>;

    beforeEach(async () => {
        localStorage.clear();

        await TestBed.configureTestingModule({
            imports: [LoginFormComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(LoginFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should start invalid with empty fields', () => {
        expect(component.loginForm.valid).toBe(false);
    });

    it('should flag a field as invalid only once touched', () => {
        expect(component.isFieldInvalid('username')).toBe(false);

        component.loginForm.get('username')?.markAsTouched();

        expect(component.isFieldInvalid('username')).toBe(true);
    });

    it('should require a username of at least 3 characters', () => {
        const control = component.loginForm.get('username');
        control?.setValue('ab');
        expect(control?.valid).toBe(false);

        control?.setValue('abc');
        expect(control?.valid).toBe(true);
    });

    it('should require a password of at least 6 characters', () => {
        const control = component.loginForm.get('password');
        control?.setValue('12345');
        expect(control?.valid).toBe(false);

        control?.setValue('123456');
        expect(control?.valid).toBe(true);
    });

    it('should not emit onLogin and should touch all fields when the form is invalid', () => {
        const spy = jest.fn();
        component.onLogin.subscribe(spy);

        component.onSubmit();

        expect(spy).not.toHaveBeenCalled();
        expect(component.loginForm.get('username')?.touched).toBe(true);
        expect(component.loginForm.get('password')?.touched).toBe(true);
    });

    it('should emit onLogin with the form value when valid', () => {
        const spy = jest.fn();
        component.onLogin.subscribe(spy);
        component.loginForm.setValue({ username: 'admin', password: 'secret1' });

        component.onSubmit();

        expect(spy).toHaveBeenCalledWith({ username: 'admin', password: 'secret1' });
    });

    it('should toggle password visibility', () => {
        expect(component.showPassword()).toBe(false);

        component.togglePasswordVisibility();
        expect(component.showPassword()).toBe(true);

        component.togglePasswordVisibility();
        expect(component.showPassword()).toBe(false);
    });

    it('should save username in localStorage when rememberMe is true', () => {
        component.loginForm.setValue({ username: 'especialista.agro', password: 'password123' });
        component.rememberMe.set(true);

        component.onSubmit();

        expect(localStorage.getItem(STORAGE_KEY_KOFIX_USER)).toBe('especialista.agro');
    });

    it('should remove username from localStorage when rememberMe is false', () => {
        localStorage.setItem(STORAGE_KEY_KOFIX_USER, 'usuario.antiguo');
        component.loginForm.setValue({ username: 'especialista.agro', password: 'password123' });
        component.rememberMe.set(false);

        component.onSubmit();

        expect(localStorage.getItem(STORAGE_KEY_KOFIX_USER)).toBeNull();
    });

    it('should load saved username on ngOnInit if present', () => {
        localStorage.setItem(STORAGE_KEY_KOFIX_USER, 'usuario.recordado');

        const newFixture = TestBed.createComponent(LoginFormComponent);
        const newComp = newFixture.componentInstance;
        newFixture.detectChanges();

        expect(newComp.loginForm.get('username')?.value).toBe('usuario.recordado');
        expect(newComp.rememberMe()).toBe(true);
    });
});
