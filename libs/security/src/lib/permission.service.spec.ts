import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { PermissionService, USER_PERMISSIONS_PROVIDER, UserPermissionsProvider } from './permission.service';
import { PERMISSIONS } from '@agroideas/utils';

describe('PermissionService', () => {
    let permissions: WritableSignal<string[]>;
    let userRoles: WritableSignal<string[]>;
    let service: PermissionService;

    beforeEach(() => {
        permissions = signal<string[]>([]);
        userRoles = signal<string[]>([]);
        const providerStub: UserPermissionsProvider = {
            permissions: permissions,
            userRoles: userRoles,
        };
        TestBed.configureTestingModule({
            providers: [
                PermissionService,
                { provide: USER_PERMISSIONS_PROVIDER, useValue: providerStub },
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
        userRoles.set(['Administrador del sistema']);
        expect(service.isAdmin()).toBe(true);
    });
});
