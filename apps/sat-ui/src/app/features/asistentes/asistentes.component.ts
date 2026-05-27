import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, computed, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UIButtonComponent, UiStatusPillComponent, UIModalComponent, UiDataTableComponent } from '@agroideas/ui';
import type { TableColumn } from '@agroideas/ui';
import { AlertService } from '@agroideas/feedback';
import { AsistenteService, Asistente, AsistentePayload } from '../../core/services/asistente.service';
import { formatDate } from '@agroideas/utils';


@Component({
  selector: 'app-asistentes',
  standalone: true,
  imports: [ReactiveFormsModule, UIButtonComponent, UiStatusPillComponent, UIModalComponent, UiDataTableComponent],
  templateUrl: './asistentes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AsistentesComponent implements OnInit {
  private alertService = inject(AlertService);
  private asistenteService = inject(AsistenteService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  asistentes = signal<Asistente[]>([]);
  loading = signal(false);
  showModal = signal(false);
  editingId = signal<string | null>(null);

  asistenteForm = this.fb.group({
    txtNombres: ['', [Validators.required]],
    txtApellidoPaterno: ['', [Validators.required]],
    txtApellidoMaterno: [''],
    txtCorreo: ['', [Validators.email]],
    codUsuario: ['', [Validators.required]],
    txtPasswordHash: [''],
    txtRol: ['TECNICO', [Validators.required]],
    fecInicioVigencia: ['', [Validators.required]],
    fecFinVigencia: ['', [Validators.required]]
  });

  columns: TableColumn[] = [
    { field: 'nombreCompleto', header: 'Asistente Técnico', sortable: true },
    { field: 'codUsuario', header: 'Usuario' },
    { field: 'txtRol', header: 'Rol' },
    { field: 'txtCorreo', header: 'Contacto' },
    { field: 'periodo', header: 'Período de Vigencia' },
    { field: 'estado', header: 'Estado', type: 'custom' }
  ];

  processedData = computed(() =>
    this.asistentes().map(a => ({
      ...a,
      nombreCompleto: `${a.txtNombres} ${a.txtApellidoPaterno} ${a.txtApellidoMaterno}`.trim(),
      periodo: `${formatDate(a.fecInicioVigencia)} - ${formatDate(a.fecFinVigencia)}`,
      estadoText: a.flgActivo ? 'Activo' : 'Inactivo',
      estadoValor: a.flgActivo ? 'Activo' : 'Finalizado'
    }))
  );

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.asistenteService.listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (datos) => this.asistentes.set(datos),
      error: (err) => {
        console.error('Error cargando asistentes:', err);
        this.alertService.toast('Error cargando asistentes', 'error');
      },
      complete: () => this.loading.set(false)
    });
  }

  openModal(asistente?: Asistente) {
    if (asistente) {
      this.editingId.set(asistente.ideAsistente);
      this.asistenteForm.patchValue({
        txtNombres: asistente.txtNombres,
        txtApellidoPaterno: asistente.txtApellidoPaterno,
        txtApellidoMaterno: asistente.txtApellidoMaterno || '',
        txtCorreo: asistente.txtCorreo || '',
        codUsuario: asistente.codUsuario,
        txtPasswordHash: '',
        txtRol: asistente.txtRol || 'TECNICO',
        fecInicioVigencia: asistente.fecInicioVigencia ? asistente.fecInicioVigencia.split('T')[0] : '',
        fecFinVigencia: asistente.fecFinVigencia ? asistente.fecFinVigencia.split('T')[0] : ''
      });
      this.asistenteForm.get('codUsuario')?.disable();
      this.asistenteForm.get('txtPasswordHash')?.clearValidators();
      this.asistenteForm.get('txtPasswordHash')?.updateValueAndValidity();
    } else {
      this.editingId.set(null);
      this.asistenteForm.reset({
        txtNombres: '',
        txtApellidoPaterno: '',
        txtApellidoMaterno: '',
        txtCorreo: '',
        codUsuario: '',
        txtPasswordHash: '',
        txtRol: 'TECNICO',
        fecInicioVigencia: new Date().toISOString().split('T')[0],
        fecFinVigencia: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0]
      });
      this.asistenteForm.get('codUsuario')?.enable();
      this.asistenteForm.get('txtPasswordHash')?.setValidators([Validators.required]);
      this.asistenteForm.get('txtPasswordHash')?.updateValueAndValidity();
    }
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingId.set(null);
    this.asistenteForm.reset();
  }

  save() {
    if (this.asistenteForm.invalid) {
      this.asistenteForm.markAllAsTouched();
      this.alertService.toast('Por favor complete los campos obligatorios correctamente.', 'warning');
      return;
    }

    const formValue = this.asistenteForm.getRawValue();

    const payload: AsistentePayload = {
      txtNombres: formValue.txtNombres || '',
      txtApellidoPaterno: formValue.txtApellidoPaterno || '',
      txtApellidoMaterno: formValue.txtApellidoMaterno || '',
      txtCorreo: formValue.txtCorreo || '',
      codUsuario: formValue.codUsuario || '',
      txtRol: formValue.txtRol || 'TECNICO',
      fecInicioVigencia: formValue.fecInicioVigencia
        ? new Date(formValue.fecInicioVigencia).toISOString()
        : new Date().toISOString(),
      fecFinVigencia: formValue.fecFinVigencia
        ? new Date(formValue.fecFinVigencia).toISOString()
        : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
    };

    if (formValue.txtPasswordHash) {
      payload.txtPasswordHash = formValue.txtPasswordHash;
    }

    if (this.editingId()) {
      payload.ideAsistente = this.editingId();
      this.asistenteService.actualizar(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
        next: (res) => {
          this.alertService.toast(res.mensaje || 'Asistente actualizado con éxito');
          this.loadData();
          this.closeModal();
        },
        error: (err) => {
          console.error(err);
          this.alertService.toast(err.error?.mensaje || 'Error al actualizar asistente.', 'error');
        }
      });
    } else {
      this.asistenteService.crear(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
        next: (res) => {
          this.alertService.toast(res.mensaje || 'Asistente registrado con éxito');
          this.loadData();
          this.closeModal();
        },
        error: (err) => {
          console.error(err);
          this.alertService.toast(err.error?.mensaje || 'Error al registrar asistente.', 'error');
        }
      });
    }
  }

  async toggleEstado(asistente: Asistente) {
    const accion = asistente.flgActivo ? 'inhabilitar' : 'habilitar';
    const confirm = await this.alertService.confirm(
      `¿${asistente.flgActivo ? 'Inhabilitar' : 'Habilitar'} asistente?`,
      `Está a punto de ${accion} a "${asistente.txtNombres} ${asistente.txtApellidoPaterno}". ¿Desea continuar?`
    );
    if (!confirm.isConfirmed) return;

    const nuevoEstado = !asistente.flgActivo;
    this.asistenteService.cambiarEstado(asistente.ideAsistente, nuevoEstado)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => {
        this.alertService.toast(res.mensaje || (nuevoEstado ? 'Asistente habilitado' : 'Asistente inhabilitado'));
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.alertService.toast(err.error?.mensaje || 'Error al cambiar el estado del asistente.', 'error');
      }
    });
  }

}

