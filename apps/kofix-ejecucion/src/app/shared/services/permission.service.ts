import { Injectable, inject, computed } from '@angular/core';
import { AuthRepository } from '../../domain/repositories/auth.repository';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private authRepository = inject(AuthRepository);

  /**
   * Signal que contiene todos los permisos del usuario actual
   */
  permissions = this.authRepository.userPermissions$;

  /**
   * Verifica si el usuario tiene un permiso específico
   * @param permission Clave del permiso (ej. 'ACCESO_KARDEX')
   */
  hasPermission(permission: string): boolean {
    return this.permissions().includes(permission);
  }

  /**
   * Verifica si el usuario tiene al menos uno de los permisos proporcionados
   * @param permissions lista de claves de permisos
   */
  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(p => this.permissions().includes(p));
  }

  /**
   * Verifica si el usuario tiene todos los permisos proporcionados
   * @param permissions lista de claves de permisos
   */
  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(p => this.permissions().includes(p));
  }

  /**
   * Signal computada que indica si el usuario es Administrador (bypass total)
   */
  isAdmin = computed(() => this.authRepository.user$()?.roles.includes('Administrador del sistema') || false);
}
