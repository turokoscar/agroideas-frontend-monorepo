import { Injectable, inject, computed, InjectionToken, Signal } from '@angular/core';

export interface UserPermissionsProvider {
    permissions: Signal<string[]>;
    userRoles?: Signal<string[]>;
    initialized$?: Signal<boolean>;
}

export const USER_PERMISSIONS_PROVIDER = new InjectionToken<UserPermissionsProvider>('USER_PERMISSIONS_PROVIDER');

@Injectable({
    providedIn: 'root'
})
export class PermissionService {
    private provider = inject(USER_PERMISSIONS_PROVIDER);

    /**
     * Signal que contiene todos los permisos del usuario actual
     */
    permissions = this.provider.permissions;

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
    isAdmin = computed(() => {
        if (this.provider.userRoles) {
            return this.provider.userRoles().includes('Administrador del sistema');
        }
        return false;
    });
}
