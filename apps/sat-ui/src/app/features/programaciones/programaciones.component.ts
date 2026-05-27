import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, computed, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UIButtonComponent, UiStatusPillComponent, UiDataTableComponent } from '@agroideas/ui';
import type { TableColumn } from '@agroideas/ui';
import { AlertService } from '@agroideas/feedback';
import { AuthService } from '../../core/services/auth.service';
import { ProgramacionService, Programacion } from '../../core/services/programacion.service';
import { AsignacionService, Asignacion } from '../../core/services/asignacion.service';
import { AsistenteService, TipoActividad } from '../../core/services/asistente.service';
import { formatDate } from '@agroideas/utils';


@Component({
  selector: 'app-programaciones',
  standalone: true,
  imports: [ReactiveFormsModule, UIButtonComponent, UiStatusPillComponent, UiDataTableComponent],
  template: `
    <div class="p-6 lg:p-8 space-y-6 font-display">
      <!-- Encabezado -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Mi Agenda de Visitas</h1>
          <p class="text-sm text-slate-500">Planifique y administre sus visitas técnicas de campo para las organizaciones asignadas</p>
        </div>
      </div>

      <!-- Tarjetas de Métricas -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div class="h-12 w-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <span class="material-symbols-outlined text-2xl">calendar_today</span>
          </div>
          <div>
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Programadas</p>
            <p class="text-2xl font-bold text-slate-800 font-mono">{{ totalCount() }}</p>
          </div>
        </div>
        <div class="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div class="h-12 w-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <span class="material-symbols-outlined text-2xl">pending_actions</span>
          </div>
          <div>
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Visitas Pendientes</p>
            <p class="text-2xl font-bold text-amber-600 font-mono">{{ pendingCount() }}</p>
          </div>
        </div>
        <div class="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div class="h-12 w-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <span class="material-symbols-outlined text-2xl">task_alt</span>
          </div>
          <div>
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completadas con Éxito</p>
            <p class="text-2xl font-bold text-emerald-600 font-mono">{{ completedCount() }}</p>
          </div>
        </div>
      </div>

      <!-- Layout Principal -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Formulario (Lado Izquierdo) -->
        <div class="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-4 lg:col-span-1 h-fit">
          <div class="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
            <span class="material-symbols-outlined text-indigo-500">add_circle</span>
            <h2 class="font-bold text-slate-800 tracking-tight">Programar Nueva Visita</h2>
          </div>

          <div [formGroup]="programacionForm" class="space-y-4">
            <div>
              <label for="ideAsignacion" class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Organización Asignada *</label>
              <select id="ideAsignacion" formControlName="ideAsignacion" class="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700">
                <option [value]="0" disabled>Seleccione una organización...</option>
                @for (asig of asignaciones(); track asig.ideAsignacion) {
                  <option [value]="asig.ideAsignacion">
                    {{ asig.txtOrganizacion }}
                  </option>
                }
              </select>
            </div>

            <div>
              <label for="ideTipoActividad" class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tipo de Actividad *</label>
              <select id="ideTipoActividad" formControlName="ideTipoActividad" class="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700">
                <option [value]="0" disabled>Seleccione tipo...</option>
                @for (tipo of tiposActividad(); track tipo.ideTipoActividad) {
                  <option [value]="tipo.ideTipoActividad">
                    {{ tipo.txtDescripcion }}
                  </option>
                }
              </select>
            </div>

            <div>
              <label for="fecVisita" class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Fecha de Visita *</label>
              <input id="fecVisita" type="date" formControlName="fecVisitaProgramada" class="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700" />
            </div>

            <div>
              <label for="txtObs" class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Observaciones / Agenda</label>
              <textarea id="txtObs" rows="3" formControlName="txtObservacion" placeholder="Detalle los objetivos o metas de esta asistencia técnica..." class="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700"></textarea>
            </div>

            <ui-button label="Programar Visita de Campo" icon="event_available" [loading]="submitting()" (onClick)="programar()" class="w-full pt-2"></ui-button>
          </div>
        </div>

        <!-- Tabla de Visitas (Lado Derecho) -->
        <div class="lg:col-span-2 space-y-4">
          <app-ui-data-table
            [data]="processedData()"
            [columns]="columns"
            [loading]="loading()"
            [hasActions]="true"
            icon="calendar_month"
            title="Listado de Programaciones"
            subtitle="Visitas técnicas planificadas para campo"
            emptyIcon="event_busy"
            emptyMessage="No tiene visitas técnicas programadas"
            emptySubMessage="Planifique una nueva visita en el formulario del panel izquierdo"
            [rowTemplate]="rowTemplate"
            [actionsTemplate]="rowActions">

            <ng-template #rowTemplate let-row let-col="col">
              @if (col.field === 'estado') {
                <app-ui-status-pill [status]="row.estadoValor" [text]="row.estadoText" />
              } @else if (col.field === 'nombreOrganizacion') {
                <div class="font-medium text-slate-700">{{ row.nombreOrganizacion }}</div>
              }
            </ng-template>

          </app-ui-data-table>
        </div>
      </div>
    </div>

    <!-- Acciones de Fila -->
    <ng-template #rowActions let-row>
      <div class="flex items-center gap-1">
        @if (row.txtEstado === 'PENDIENTE') {
          <ui-button
            iconOnly
            appearance="soft"
            severity="warning"
            size="sm"
            icon="cancel"
            ariaLabel="Cancelar Visita"
            (onClick)="$event.stopPropagation(); cancelarVisita(row)"
          />
        }
      </div>
    </ng-template>
  `,
  styles: [`
    :host {
      display: block;
      background-color: #f8fafc;
      min-height: 100vh;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgramacionesComponent implements OnInit {
  private alertService = inject(AlertService);
  private authService = inject(AuthService);
  private programacionService = inject(ProgramacionService);
  private asignacionService = inject(AsignacionService);
  private asistenteService = inject(AsistenteService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  programaciones = signal<Programacion[]>([]);
  asignaciones = signal<Asignacion[]>([]);
  tiposActividad = signal<TipoActividad[]>([]);

  loading = signal(false);
  submitting = signal(false);

  programacionForm = this.fb.group({
    ideAsignacion: [0, [Validators.required, Validators.min(1)]],
    ideTipoActividad: [0, [Validators.required, Validators.min(1)]],
    fecVisitaProgramada: [new Date().toISOString().split('T')[0], [Validators.required]],
    txtObservacion: ['']
  });

  columns: TableColumn[] = [
    { field: 'nombreOrganizacion', header: 'Organización', sortable: true },
    { field: 'fechaFormateada', header: 'Fecha Planificada' },
    { field: 'txtObservacion', header: 'Objetivo/Observaciones' },
    { field: 'estado', header: 'Estado', type: 'custom' }
  ];

  totalCount = computed(() => this.programaciones().length);
  pendingCount = computed(() => this.programaciones().filter(p => p.txtEstado === 'PENDIENTE').length);
  completedCount = computed(() => this.programaciones().filter(p => p.txtEstado === 'COMPLETADA').length);

  processedData = computed(() =>
    this.programaciones().map(p => ({
      nombreOrganizacion: p.txtOrganizacion,
      fechaFormateada: formatDate(p.fecVisitaProgramada),
      txtObservacion: p.txtObservacion,
      txtOrganizacion: p.txtOrganizacion,
      txtEstado: p.txtEstado,
      estadoText: p.txtEstado === 'PENDIENTE' ? 'Pendiente' : (p.txtEstado === 'COMPLETADA' ? 'Completada' : 'Cancelada'),
      estadoValor: p.txtEstado === 'PENDIENTE' ? 'pending' : (p.txtEstado === 'COMPLETADA' ? 'Activo' : 'Finalizado')
    }))
  );

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    const userId = this.authService.user()?.id;

    if (!userId) {
      this.alertService.toast('Sesión de usuario inválida', 'error');
      return;
    }

    this.loading.set(true);

    this.programacionService.listarPorAsistente(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (datos) => this.programaciones.set(datos),
      error: (err) => {
        console.error('Error cargando programaciones:', err);
        this.alertService.toast('Error cargando programaciones', 'error');
      }
    });

    this.asignacionService.listarPorAsistente(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (datos) => this.asignaciones.set(datos.filter(a => a.flgActivo)),
      error: (err) => {
        console.error('Error cargando asignaciones:', err);
        this.alertService.toast('Error cargando organizaciones asignadas', 'error');
      }
    });

    this.asistenteService.listarTiposActividad()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (datos) => this.tiposActividad.set(datos),
      error: (err) => {
        console.error('Error cargando tipos de actividad:', err);
        this.tiposActividad.set([
          { ideTipoActividad: 1, txtDescripcion: 'Visita de Monitoreo' },
          { ideTipoActividad: 2, txtDescripcion: 'Asistencia Técnica de Campo' },
          { ideTipoActividad: 3, txtDescripcion: 'Capacitación Grupal' },
          { ideTipoActividad: 4, txtDescripcion: 'Auditoría Interna de OPA' }
        ]);
      },
      complete: () => this.loading.set(false)
    });
  }

  programar() {
    if (this.programacionForm.invalid) {
      this.programacionForm.markAllAsTouched();
      this.alertService.toast('Por favor complete todos los campos obligatorios correctamente.', 'warning');
      return;
    }

    this.submitting.set(true);
    const formValue = this.programacionForm.value;

    this.programacionService.crear({
      ideAsignacion: Number(formValue.ideAsignacion),
      ideTipoActividad: Number(formValue.ideTipoActividad),
      fecVisitaProgramada: new Date(formValue.fecVisitaProgramada || '').toISOString(),
      txtObservacion: formValue.txtObservacion || '',
      txtEstado: 'PENDIENTE',
      flgActivo: true
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => {
        this.alertService.toast(res.mensaje || 'Visita técnica programada con éxito.');
        this.loadData();
        this.programacionForm.reset({
          ideAsignacion: 0,
          ideTipoActividad: 0,
          txtObservacion: '',
          fecVisitaProgramada: new Date().toISOString().split('T')[0]
        });
      },
      error: (err) => {
        console.error(err);
        this.alertService.toast(err.error?.mensaje || 'Error al programar visita técnica.', 'error');
      },
      complete: () => this.submitting.set(false)
    });
  }

  async cancelarVisita(row: Programacion) {
    const confirm = await this.alertService.confirm(
      '¿Cancelar Visita Programada?',
      `Está a punto de cancelar la visita programada para "${row.txtOrganizacion}". ¿Desea continuar?`
    );
    if (!confirm.isConfirmed) return;

    this.programacionService.cambiarEstado(row.ideProgramacion, 'CANCELADA')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => {
        this.alertService.toast(res.mensaje || 'Visita técnica cancelada.');
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.alertService.toast(err.error?.mensaje || 'Error al cancelar la visita técnica.', 'error');
      }
    });
  }

}

