import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { PermissionService } from './permission.service';
import { AuthRepository } from '../../domain/repositories/auth.repository';
import { User } from '../../domain/models/auth/auth.model';
import { PERMISSIONS } from '../utils/permissions';

describe('PermissionService', () => {
    let permissions: WritableSignal<string[]>;
    let user: WritableSignal<User | null>;
    let service: PermissionService;

    beforeEach(() => {
        permissions = signal<string[]>([]);
        user = signal<User | null>(null);
        const authStub: Partial<AuthRepository> = {
            userPermissions$: permissions,
            user$: user,
        };
        TestBed.configureTestingModule({
            providers: [
                PermissionService,
                { provide: AuthRepository, useValue: authStub },
            ],
        });
        service = TestBed.inject(PermissionService);
    });

    it('hasPermission refleja los permisos del usuario', () => {
        permissions.set([PERMISSIONS.ACTIVAR_CHEQUES, PERMISSIONS.ACCESO_APP]);
        expect(service.hasPermission(PERMISSIONS.ACTIVAR_CHEQUES)).toBe(true);
        expect(service.hasPermission(PERMISSIONS.CIERRE_CONTABLE)).toBe(false);
    });

    it('hasAnyPermission y hasAllPermissions', () => {
        permissions.set([PERMISSIONS.GESTION_CARTERA]);
        expect(service.hasAnyPermission([PERMISSIONS.GESTION_CARTERA, PERMISSIONS.CIERRE_CONTABLE])).toBe(true);
        expect(service.hasAllPermissions([PERMISSIONS.GESTION_CARTERA, PERMISSIONS.CIERRE_CONTABLE])).toBe(false);
        expect(service.hasAllPermissions([PERMISSIONS.GESTION_CARTERA])).toBe(true);
    });

    it('reacciona a cambios del signal de permisos', () => {
        expect(service.hasPermission(PERMISSIONS.VER_TODOS_CONVENIOS)).toBe(false);
        permissions.set([PERMISSIONS.VER_TODOS_CONVENIOS]);
        expect(service.hasPermission(PERMISSIONS.VER_TODOS_CONVENIOS)).toBe(true);
    });

    it('isAdmin es true solo si el rol Administrador del sistema está presente', () => {
        expect(service.isAdmin()).toBe(false);
        user.set({ name: 'X', email: '', role: 'Administrador del sistema', roles: ['Administrador del sistema'] });
        expect(service.isAdmin()).toBe(true);
    });
});
