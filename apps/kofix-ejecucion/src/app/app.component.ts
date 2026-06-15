import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthRepository } from './domain/repositories/auth.repository';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <div *ngIf="isLoadingPermissions()" style="background:yellow;padding:2rem">
      <h3>LOADING...</h3>
    </div>
    <div style="padding:2rem;background:#f0f0f0">
      <p>Loading={{ isLoadingPermissions() }} Init={{ permissionsInitialized() }} Auth={{ isAuthenticated() }}</p>
      <router-outlet></router-outlet>
    </div>
  `
})
export class AppComponent {
  private authRepository = inject(AuthRepository);
  isLoadingPermissions = this.authRepository.isLoadingPermissions$;
  permissionsInitialized = this.authRepository.permissionsInitialized$;
  isAuthenticated = this.authRepository.isAuthenticated$;
}
