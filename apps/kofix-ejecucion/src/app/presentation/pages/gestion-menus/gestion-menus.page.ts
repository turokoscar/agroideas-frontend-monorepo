import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { 
  TableColumn, 
  UIButtonComponent, 
  UiDataTableComponent, 
  UiFilterBarComponent, 
  UiStatusPillComponent, 
  UIModalComponent
} from '@agroideas/ui';
import { AlertService } from '@agroideas/feedback';
import { MenuItem } from '../../../domain/models/menu/menu.model';
import { GetMenusListUseCase } from '../../../domain/usecases/menu/get-menus-list.usecase';
import { CreateMenuUseCase } from '../../../domain/usecases/menu/create-menu.usecase';
import { UpdateMenuUseCase } from '../../../domain/usecases/menu/update-menu.usecase';
import { DeleteMenuUseCase } from '../../../domain/usecases/menu/delete-menu.usecase';
import { GetMenuRolesUseCase } from '../../../domain/usecases/menu/get-menu-roles.usecase';
import { AssignMenuRoleUseCase } from '../../../domain/usecases/menu/assign-menu-role.usecase';
import { RemoveMenuRoleUseCase } from '../../../domain/usecases/menu/remove-menu-role.usecase';

@Component({
  selector: 'app-gestion-menus-page',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule, 
    UiDataTableComponent, 
    UiFilterBarComponent, 
    UiStatusPillComponent, 
    UIButtonComponent, 
    UIModalComponent
  ],
  templateUrl: './gestion-menus.page.html',
  styleUrls: ['./gestion-menus.page.sass']
})
export class GestionMenusPageComponent implements OnInit {
  private getMenusListUseCase = inject(GetMenusListUseCase);
  private createMenuUseCase = inject(CreateMenuUseCase);
  private updateMenuUseCase = inject(UpdateMenuUseCase);
  private deleteMenuUseCase = inject(DeleteMenuUseCase);
  private getMenuRolesUseCase = inject(GetMenuRolesUseCase);
  private assignMenuRoleUseCase = inject(AssignMenuRoleUseCase);
  private removeMenuRoleUseCase = inject(RemoveMenuRoleUseCase);
  private alertService = inject(AlertService);
  private fb = inject(FormBuilder);

  menus = signal<MenuItem[]>([]);
  filteredMenus = signal<MenuItem[]>([]);
  loading = signal(false);
  isSubmitting = signal(false);

  // Filtros
  search = '';

  // Formulario y Modal
  isModalOpen = signal(false);
  isRolesModalOpen = signal(false);
  menuForm!: FormGroup;
  selectedMenu = signal<MenuItem | null>(null);

  parentMenus = computed(() => {
    const selectedId = this.selectedMenu()?.id;
    // Only root menus (menuPadreId === null or undefined) can act as parent menus,
    // and we exclude the current menu itself to avoid self-referencing loops.
    return this.menus().filter(m => !m.menuPadreId && m.id !== selectedId);
  });

  // Gestión de Roles por Menú
  menuRoles = signal<string[]>([]);
  availableRoles = ['Administrador del sistema', 'Jefe de Unidad de Negocios', 'Unidad de Negocios'];

  columns: TableColumn[] = [
    { field: 'id', header: 'ID', width: '80px', align: 'center' },
    { field: 'nombre', header: 'Nombre' },
    { field: 'ruta', header: 'Ruta' },
    { field: 'icono', header: 'Icono', type: 'custom', width: '100px', align: 'center' },
    { field: 'orden', header: 'Orden', width: '100px', align: 'center' },
    { field: 'menuPadreId', header: 'ID Padre', width: '100px', align: 'center' },
    { field: 'esHijo', header: 'Jerarquía', type: 'custom', width: '120px', align: 'center' }
  ];

  ngOnInit(): void {
    this.initForm();
    this.loadMenus();
  }

  initForm(): void {
    this.menuForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      descripcion: ['', [Validators.maxLength(250)]],
      icono: ['circle', [Validators.maxLength(100)]],
      ruta: ['', [Validators.maxLength(250)]],
      menuPadreId: [null],
      orden: [1, [Validators.required, Validators.min(1)]]
    });
  }

  loadMenus(): void {
    this.loading.set(true);
    this.getMenusListUseCase.execute().subscribe({
      next: (data) => {
        this.menus.set(data);
        this.applyFilter();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar menús:', err);
        this.alertService.show('Error', 'No se pudieron recuperar los menús.', 'error');
        this.loading.set(false);
      }
    });
  }

  applyFilter(): void {
    const term = this.search.toLowerCase().trim();
    if (!term) {
      this.filteredMenus.set(this.menus());
    } else {
      this.filteredMenus.set(
        this.menus().filter(m => 
          m.nombre.toLowerCase().includes(term) || 
          (m.ruta && m.ruta.toLowerCase().includes(term))
        )
      );
    }
  }

  openCreateModal(): void {
    this.selectedMenu.set(null);
    this.menuForm.reset({
      icono: 'circle',
      orden: 1,
      menuPadreId: null
    });
    this.isModalOpen.set(true);
  }

  openEditModal(menu: MenuItem): void {
    this.selectedMenu.set(menu);
    this.menuForm.patchValue({
      nombre: menu.nombre,
      descripcion: menu.descripcion,
      icono: menu.icono || 'circle',
      ruta: menu.ruta,
      menuPadreId: menu.menuPadreId,
      orden: menu.orden
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  saveMenu(): void {
    if (this.menuForm.invalid) {
      this.menuForm.markAllAsTouched();
      return;
    }

    const payload: MenuItem = {
      id: this.selectedMenu()?.id || 0,
      ...this.menuForm.value
    };

    const isEdit = !!this.selectedMenu();
    const action$ = isEdit 
      ? this.updateMenuUseCase.execute(payload.id, payload)
      : this.createMenuUseCase.execute(payload);

    this.isSubmitting.set(true);
    action$.subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.exitoso) {
          this.alertService.show('Éxito', isEdit ? 'Menú actualizado correctamente.' : 'Menú creado correctamente.', 'success');
          this.closeModal();
          this.loadMenus();
        } else {
          this.alertService.show('Error', res.mensaje || 'Ocurrió un error al procesar el menú.', 'error');
        }
      },
      error: () => {
        this.isSubmitting.set(false);
        this.alertService.show('Error', 'Ocurrió un error en el servidor.', 'error');
      }
    });
  }

  deleteMenu(menu: MenuItem): void {
    this.alertService.confirm('¿Confirmar eliminación?', `¿Desea eliminar lógicamente el menú "${menu.nombre}"? Sus hijos también se desactivarán.`).then((confirmed) => {
      if (confirmed.isConfirmed) {
        this.deleteMenuUseCase.execute(menu.id).subscribe({
          next: (res) => {
            if (res.exitoso) {
              this.alertService.show('Eliminado', 'El menú ha sido desactivado.', 'success');
              this.loadMenus();
            } else {
              this.alertService.show('Error', res.mensaje || 'No se pudo eliminar.', 'error');
            }
          }
        });
      }
    });
  }

  // --- GESTIÓN DE ROLES ---
  openRolesModal(menu: MenuItem): void {
    this.selectedMenu.set(menu);
    this.isRolesModalOpen.set(true);
    this.loadMenuRoles(menu.id);
  }

  closeRolesModal(): void {
    this.isRolesModalOpen.set(false);
  }

  loadMenuRoles(menuId: number): void {
    this.getMenuRolesUseCase.execute(menuId).subscribe({
      next: (res) => {
        if (res.exitoso) {
          this.menuRoles.set(res.datos || []);
        }
      }
    });
  }

  isRoleAssigned(rol: string): boolean {
    return this.menuRoles().includes(rol);
  }

  toggleRole(rol: string, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const menuId = this.selectedMenu()?.id;
    if (!menuId) return;

    if (checkbox.checked) {
      this.assignMenuRoleUseCase.execute(menuId, rol).subscribe({
        next: (res) => {
          if (res.exitoso) {
            this.loadMenuRoles(menuId);
          } else {
            checkbox.checked = false;
            this.alertService.show('Error', res.mensaje || 'No se pudo asignar el rol.', 'error');
          }
        },
        error: () => {
          checkbox.checked = false;
          this.alertService.show('Error', 'Ocurrió un error en el servidor.', 'error');
        }
      });
    } else {
      this.removeMenuRoleUseCase.execute(menuId, rol).subscribe({
        next: (res) => {
          if (res.exitoso) {
            this.loadMenuRoles(menuId);
          } else {
            checkbox.checked = true;
            this.alertService.show('Error', res.mensaje || 'No se pudo remover el rol.', 'error');
          }
        },
        error: () => {
          checkbox.checked = true;
          this.alertService.show('Error', 'Ocurrió un error en el servidor.', 'error');
        }
      });
    }
  }
}
