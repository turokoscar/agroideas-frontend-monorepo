import { Component, EventEmitter, Input, Output, inject } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UIButtonComponent } from '@agroideas/ui';

@Component({
    selector: 'app-login-form',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        UIButtonComponent
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
        username: ['', [Validators.required, Validators.minLength(3)]],
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
