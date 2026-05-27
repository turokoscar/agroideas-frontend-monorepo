import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, computed, OnInit } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UIButtonComponent, UiStatusPillComponent, UIModalComponent, UiDataTableComponent } from '@agroideas/ui';
import type { TableColumn } from '@agroideas/ui';
import { AlertService } from '@agroideas/feedback';
import { AsignacionService, Asignacion } from '../../core/services/asignacion.service';
import { AsistenteService, Asistente } from '../../core/services/asistente.service';
import { OrganizacionService, Organizacion } from '../../core/services/organizacion.service';
import { debounceTime, distinctUntilChanged, skip } from 'rxjs';

@Component({
  selector: 'app-asignaciones',
  standalone: true,
  imports: [ReactiveFormsModule, UIButtonComponent, UiStatusPillComponent, UIModalComponent, UiDataTableComponent],
  templateUrl: './asignaciones.component.html',
  styleUrl: './asignaciones.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AsignacionesComponent implements OnInit {
  private alertService = inject(AlertService);
  private asignacionService = inject(AsignacionService);
  private asistenteService = inject(AsistenteService);
  private organizacionService = inject(OrganizacionService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  asignaciones = signal<Asignacion[]>([]);
  asistentes = signal<Asistente[]>([]);
  organizaciones = signal<Organizacion[]>([]);

  regionBusqueda = signal('');
  regionSeleccionada = signal('');
  regiones = signal<string[]>([]);

  loading = signal(false);
  showModal = signal(false);
  editingId = signal<number | null>(null);

  asignacionForm = this.fb.group({
    ideAsistente: ['', [Validators.required]],
    ideOrganizacion: ['', [Validators.required]]
  });

  columns: TableColumn[] = [
    { field: 'txtAsistente', header: 'Asistente', sortable: true },
    { field: 'txtOrganizacion', header: 'Organización', sortable: true },
    { field: 'estado', header: 'Estado', type: 'custom' }
  ];

  processedData = computed(() =>
    this.asignaciones().map(a => ({
      ...a,
      estadoText: a.flgActivo ? 'Activo' : 'Inactivo',
      estadoValor: a.flgActivo ? 'Activo' : 'Finalizado'
    }))
  );

  ngOnInit() {
    this.loadAsignaciones();
    this.loadAsistentes();
    this.loadOrganizaciones(true);

    toObservable(this.regionBusqueda)
      .pipe(
        skip(1),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.loadOrganizaciones();
      });
  }

  loadAsignaciones() {
    this.loading.set(true);
    this.asignacionService.listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (datos) => this.asignaciones.set(datos),
      error: () => {
        console.error('Error cargando asignaciones');
        this.alertService.toast('Error cargando asignaciones', 'error');
      },
      complete: () => this.loading.set(false)
    });
  }

  loadAsistentes() {
    this.asistenteService.listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (datos) => this.asistentes.set(datos),
      error: () => console.error('Error cargando asistentes')
    });
  }

  loadOrganizaciones(extraerRegiones = false) {
    this.organizacionService
      .listar({ busqueda: this.regionBusqueda(), region: this.regionSeleccionada() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datos) => {
          this.organizaciones.set(datos);
          if (extraerRegiones) {
            const unique = [...new Set(datos.map(o => o.txtDepartamento).filter(Boolean))].sort();
            this.regiones.set(unique as string[]);
          }
        },
        error: () => console.error('Error cargando organizaciones')
      });
  }

  onSearchChange(value: string) {
    this.regionBusqueda.set(value);
  }

  onRegionChange(value: string) {
    this.regionSeleccionada.set(value);
    this.loadOrganizaciones();
  }

  openModal(asignacion?: Asignacion) {
    if (asignacion) {
      this.editingId.set(asignacion.ideAsignacion);
      this.asignacionForm.patchValue({
        ideAsistente: asignacion.ideAsistente,
        ideOrganizacion: asignacion.ideOrganizacion
      });
    } else {
      this.editingId.set(null);
      this.asignacionForm.reset({
        ideAsistente: '',
        ideOrganizacion: ''
      });
    }
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingId.set(null);
    this.asignacionForm.reset();
  }

  save() {
    if (this.asignacionForm.invalid) {
      this.asignacionForm.markAllAsTouched();
      this.alertService.toast('Por favor complete los campos obligatorios correctamente.', 'warning');
      return;
    }

    const editingId = this.editingId();
    const formValue = this.asignacionForm.value;

    if (editingId) {
      this.asignacionService
        .actualizar({
          ideAsistente: formValue.ideAsistente || '',
          ideOrganizacion: formValue.ideOrganizacion || '',
          ideAsignacion: editingId,
          flgActivo: true
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.alertService.toast(res.mensaje || 'Asignación actualizada con éxito');
            this.loadAsignaciones();
            this.closeModal();
          },
          error: (err) => {
            console.error(err);
            this.alertService.toast(err.error?.mensaje || 'Error al actualizar', 'error');
          }
        });
    } else {
      this.asignacionService
        .crear({
          ideAsistente: formValue.ideAsistente || '',
          ideOrganizacion: formValue.ideOrganizacion || ''
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.alertService.toast(res.mensaje || 'Asignación creada con éxito');
            this.loadAsignaciones();
            this.closeModal();
          },
          error: (err) => {
            console.error(err);
            this.alertService.toast(err.error?.mensaje || 'Error al crear', 'error');
          }
        });
    }
  }

  toggleEstado(asignacion: Asignacion) {
    this.asignacionService.cambiarEstado(asignacion.ideAsignacion, !asignacion.flgActivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => {
        this.alertService.toast(res.mensaje || (asignacion.flgActivo ? 'Asignación desactivada' : 'Asignación activada'));
        this.loadAsignaciones();
      },
      error: () => this.alertService.toast('Error al cambiar estado', 'error')
    });
  }

  delete(id: number) {
    this.alertService.confirm('¿Estás seguro?', '¿Desea eliminar permanentemente esta asignación?').then((result) => {
      if (result.isConfirmed) {
        this.asignacionService.eliminar(id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
          next: (res) => {
            this.alertService.toast(res.mensaje || 'Asignación eliminada con éxito');
            this.loadAsignaciones();
          },
          error: () => this.alertService.toast('Error al eliminar', 'error')
        });
      }
    });
  }



  getAsistenteNombre(ide: string): string {
    const a = this.asistentes().find(x => x.ideAsistente === ide);
    return a ? `${a.txtNombres} ${a.txtApellidoPaterno}` : ide;
  }
}
