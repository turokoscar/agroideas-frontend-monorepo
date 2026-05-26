import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthRepository } from './domain/repositories/auth.repository';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.sass'
})
export class AppComponent implements OnInit {
  private authRepository = inject(AuthRepository);
  
  // Exponer señales para la vista
  isLoadingPermissions = this.authRepository.isLoadingPermissions$;
  permissionsInitialized = this.authRepository.permissionsInitialized$;
  isAuthenticated = this.authRepository.isAuthenticated$;

  ngOnInit(): void {
    // Verificar periódicamente la expiración del token
    setInterval(() => {
      this.authRepository.checkExpiration();
    }, 60000);
  }
}
