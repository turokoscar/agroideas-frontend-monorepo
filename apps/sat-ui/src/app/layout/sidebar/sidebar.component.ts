import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavLink {
  to: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  user = this.authService.user;

  links: NavLink[] = [
    { to: '/dashboard', icon: 'dashboard', label: 'Panel General' },
    { to: '/asignaciones', icon: 'assignment', label: 'Asignaciones' },
    { to: '/asistentes', icon: 'people', label: 'Asistentes Técnicos' },
    { to: '/organizaciones', icon: 'business', label: 'Organizaciones' },
    { to: '/evidencias', icon: 'photo_camera', label: 'Evidencias' },
    { to: '/informes', icon: 'description', label: 'Informes' },
    { to: '/sincronizacion', icon: 'sync', label: 'Sincronización' },
  ];

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
