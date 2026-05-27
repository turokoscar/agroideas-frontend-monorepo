import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavLink {
  to: string;
  icon: string;
  label: string;
  roles: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  user = this.authService.user;

  allLinks: NavLink[] = [
    { to: '/dashboard', icon: 'dashboard', label: 'Panel General', roles: ['ADMINISTRADOR'] },
    { to: '/asistentes', icon: 'people', label: 'Asistentes Técnicos', roles: ['ADMINISTRADOR'] },
    { to: '/asignaciones', icon: 'assignment', label: 'Asignaciones', roles: ['ADMINISTRADOR'] },
    { to: '/organizaciones', icon: 'business', label: 'Organizaciones', roles: ['ADMINISTRADOR'] },
    { to: '/programaciones', icon: 'calendar_month', label: 'Programaciones', roles: ['TECNICO'] },
    { to: '/evidencias', icon: 'photo_camera', label: 'Evidencias', roles: ['ADMINISTRADOR', 'TECNICO'] },
    { to: '/informes', icon: 'description', label: 'Informes', roles: ['ADMINISTRADOR', 'TECNICO'] },
    { to: '/sincronizacion', icon: 'sync', label: 'Sincronización', roles: ['ADMINISTRADOR', 'TECNICO'] },
  ];

  links = computed(() => {
    const userRole = this.user()?.role;
    if (!userRole) return [];
    return this.allLinks.filter(link => link.roles.includes(userRole));
  });

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
