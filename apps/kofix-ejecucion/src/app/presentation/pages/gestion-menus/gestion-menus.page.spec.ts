import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { GestionMenusPageComponent } from './gestion-menus.page';
import { MenuRepository } from '../../../domain/repositories/menu.repository';
import { MenuItem } from '../../../domain/models/menu/menu.model';

describe('GestionMenusPageComponent', () => {
    let component: GestionMenusPageComponent;
    let fixture: ComponentFixture<GestionMenusPageComponent>;
    let mockRepo: jest.Mocked<Partial<MenuRepository>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;

    const buildMenu = (overrides: Partial<MenuItem> = {}): MenuItem => ({
        id: 1,
        nombre: 'Convenios',
        ruta: '/main/convenios',
        orden: 1,
        ...overrides
    });

    beforeEach(async () => {
        mockRepo = {
            getMenusList: jest.fn().mockReturnValue(of([])),
            createMenu: jest.fn(),
            updateMenu: jest.fn(),
            deleteMenu: jest.fn(),
            getRolesByMenuId: jest.fn().mockReturnValue(of({ exitoso: true, datos: [] })),
            assignRoleToMenu: jest.fn(),
            removeRoleFromMenu: jest.fn()
        };
        mockAlert = { show: jest.fn(), confirm: jest.fn() };

        await TestBed.configureTestingModule({
            imports: [GestionMenusPageComponent],
            providers: [
                { provide: MenuRepository, useValue: mockRepo },
                { provide: AlertService, useValue: mockAlert }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(GestionMenusPageComponent);
        component = fixture.componentInstance;
    });

    it('should load the menus list on init', () => {
        mockRepo.getMenusList = jest.fn().mockReturnValue(of([buildMenu()]));

        fixture.detectChanges();

        expect(component.menus()).toHaveLength(1);
        expect(component.filteredMenus()).toHaveLength(1);
    });

    it('should filter menus by nombre or ruta, case-insensitively', () => {
        mockRepo.getMenusList = jest.fn().mockReturnValue(
            of([buildMenu({ id: 1, nombre: 'Convenios', ruta: '/main/convenios' }), buildMenu({ id: 2, nombre: 'Reportes', ruta: '/main/reportes' })])
        );
        fixture.detectChanges();

        component.search.set('conve');
        component.applyFilter();

        expect(component.filteredMenus()).toHaveLength(1);
        expect(component.filteredMenus()[0].id).toBe(1);
    });

    it('should only offer root menus (no menuPadreId) as parents, excluding the menu being edited', () => {
        mockRepo.getMenusList = jest.fn().mockReturnValue(
            of([buildMenu({ id: 1, menuPadreId: undefined }), buildMenu({ id: 2, menuPadreId: 1 }), buildMenu({ id: 3, menuPadreId: undefined })])
        );
        fixture.detectChanges();
        component.selectedMenu.set(buildMenu({ id: 1 }));

        expect(component.parentMenus().map((m) => m.id)).toEqual([3]);
    });

    it('should not submit an invalid form', () => {
        fixture.detectChanges();
        component.openCreateModal();
        component.menuForm.patchValue({ nombre: '' }); // required

        component.saveMenu();

        expect(mockRepo.createMenu).not.toHaveBeenCalled();
        expect(component.menuForm.touched).toBe(true);
    });

    it('should reject a ruta that does not match the /main/ pattern', () => {
        fixture.detectChanges();
        component.openCreateModal();
        component.menuForm.patchValue({ nombre: 'Reportes', ruta: 'reportes' });

        expect(component.menuForm.valid).toBe(false);
    });

    it('should create a new menu when there is no selection', () => {
        fixture.detectChanges();
        component.openCreateModal();
        component.menuForm.patchValue({ nombre: 'Reportes', ruta: '/main/reportes', orden: 2 });
        mockRepo.createMenu = jest.fn().mockReturnValue(of({ exitoso: true }));

        component.saveMenu();

        expect(mockRepo.createMenu).toHaveBeenCalled();
        expect(mockRepo.updateMenu).not.toHaveBeenCalled();
        expect(mockAlert.show).toHaveBeenCalledWith('Éxito', 'Menú creado correctamente.', 'success');
        expect(component.isModalOpen()).toBe(false);
    });

    it('should update the existing menu when editing', () => {
        fixture.detectChanges();
        component.openEditModal(buildMenu({ id: 7 }));
        mockRepo.updateMenu = jest.fn().mockReturnValue(of({ exitoso: true }));

        component.saveMenu();

        expect(mockRepo.updateMenu).toHaveBeenCalledWith(7, expect.objectContaining({ id: 7 }));
        expect(mockRepo.createMenu).not.toHaveBeenCalled();
    });

    it('should show the server error when saving fails logically', () => {
        fixture.detectChanges();
        component.openCreateModal();
        component.menuForm.patchValue({ nombre: 'Reportes', ruta: '/main/reportes', orden: 2 });
        mockRepo.createMenu = jest.fn().mockReturnValue(of({ exitoso: false, mensaje: 'Ruta duplicada' }));

        component.saveMenu();

        expect(mockAlert.show).toHaveBeenCalledWith('Error', 'Ruta duplicada', 'error');
        expect(component.isModalOpen()).toBe(true);
    });

    it('should not delete when the confirmation is dismissed', async () => {
        fixture.detectChanges();
        mockAlert.confirm = jest.fn().mockResolvedValue({ isConfirmed: false });

        component.deleteMenu(buildMenu());
        await Promise.resolve();

        expect(mockRepo.deleteMenu).not.toHaveBeenCalled();
    });

    it('should delete and reload when confirmed', async () => {
        fixture.detectChanges();
        mockAlert.confirm = jest.fn().mockResolvedValue({ isConfirmed: true });
        mockRepo.deleteMenu = jest.fn().mockReturnValue(of({ exitoso: true }));

        component.deleteMenu(buildMenu({ id: 3 }));
        await Promise.resolve();

        expect(mockRepo.deleteMenu).toHaveBeenCalledWith(3);
        expect(mockAlert.show).toHaveBeenCalledWith('Eliminado', expect.any(String), 'success');
    });

    describe('toggleRole', () => {
        const buildEvent = (checked: boolean): Event => ({ target: { checked } }) as unknown as Event;

        it('should assign the role when checked, and reload the roles on success', () => {
            fixture.detectChanges();
            component.selectedMenu.set(buildMenu({ id: 5 }));
            mockRepo.assignRoleToMenu = jest.fn().mockReturnValue(of({ exitoso: true }));

            component.toggleRole('ADMIN', buildEvent(true));

            expect(mockRepo.assignRoleToMenu).toHaveBeenCalledWith(5, 'ADMIN');
            expect(mockRepo.getRolesByMenuId).toHaveBeenCalledWith(5);
        });

        it('should revert the checkbox and alert when assigning fails', () => {
            fixture.detectChanges();
            component.selectedMenu.set(buildMenu({ id: 5 }));
            mockRepo.assignRoleToMenu = jest.fn().mockReturnValue(of({ exitoso: false, mensaje: 'No autorizado' }));
            const event = buildEvent(true);

            component.toggleRole('ADMIN', event);

            expect((event.target as HTMLInputElement).checked).toBe(false);
            expect(mockAlert.show).toHaveBeenCalledWith('Error', 'No autorizado', 'error');
        });

        it('should remove the role when unchecked', () => {
            fixture.detectChanges();
            component.selectedMenu.set(buildMenu({ id: 5 }));
            mockRepo.removeRoleFromMenu = jest.fn().mockReturnValue(of({ exitoso: true }));

            component.toggleRole('ADMIN', buildEvent(false));

            expect(mockRepo.removeRoleFromMenu).toHaveBeenCalledWith(5, 'ADMIN');
        });

        it('should do nothing without a selected menu', () => {
            fixture.detectChanges();
            component.selectedMenu.set(null);

            component.toggleRole('ADMIN', buildEvent(true));

            expect(mockRepo.assignRoleToMenu).not.toHaveBeenCalled();
        });
    });

    it('should report whether a role is currently assigned', () => {
        fixture.detectChanges();
        component.menuRoles.set(['ADMIN']);

        expect(component.isRoleAssigned('ADMIN')).toBe(true);
        expect(component.isRoleAssigned('OTRO')).toBe(false);
    });
});
