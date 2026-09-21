import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

export const STORAGE_KEY_KOFIX_USER = 'kofix_remembered_user';

@Component({
    selector: 'app-login-form',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule
    ],
    templateUrl: './login-form.component.html',
    styleUrls: ['./login-form.component.sass']
})
export class LoginFormComponent implements OnInit {
    @Input() loading = false;
    @Input() errorMessage = '';
    @Output() onLogin = new EventEmitter<any>();

    private fb = inject(FormBuilder);

    showPassword = signal(false);
    rememberMe = signal(false);

    loginForm = this.fb.group({
        username: ['', [Validators.required, Validators.minLength(3)]],
        password: ['', [Validators.required, Validators.minLength(6)]]
    });

    ngOnInit(): void {
        const savedUser = localStorage.getItem(STORAGE_KEY_KOFIX_USER);
        if (savedUser) {
            this.loginForm.patchValue({ username: savedUser });
            this.rememberMe.set(true);
        }
    }

    togglePasswordVisibility(): void {
        this.showPassword.update(v => !v);
    }

    isFieldInvalid(fieldName: string): boolean {
        const field = this.loginForm.get(fieldName);
        return !!(field && field.invalid && field.touched);
    }

    onSubmit() {
        if (this.loginForm.valid) {
            const username = this.loginForm.value.username ?? '';
            if (this.rememberMe()) {
                localStorage.setItem(STORAGE_KEY_KOFIX_USER, username);
            } else {
                localStorage.removeItem(STORAGE_KEY_KOFIX_USER);
            }
            this.onLogin.emit(this.loginForm.value);
        } else {
            this.loginForm.markAllAsTouched();
        }
    }
}
