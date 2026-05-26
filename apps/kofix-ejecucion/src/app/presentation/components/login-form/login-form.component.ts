import { Component, EventEmitter, Input, Output, inject } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-login-form',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        InputTextModule,
        ButtonModule
    ],
    templateUrl: './login-form.component.html',
    styleUrls: ['./login-form.component.sass']
})
export class LoginFormComponent {
    @Input() loading = false;
    @Input() errorMessage = '';
    @Output() onLogin = new EventEmitter<any>();

    private fb = inject(FormBuilder);

    loginForm = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]]
    });

    isFieldInvalid(fieldName: string): boolean {
        const field = this.loginForm.get(fieldName);
        return !!(field && field.invalid && field.touched);
    }

    onSubmit() {
        if (this.loginForm.valid) {
            this.onLogin.emit(this.loginForm.value);
        } else {
            this.loginForm.markAllAsTouched();
        }
    }
}
