import { ChangeDetectionStrategy, Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { OrganizacionService, Organizacion } from '../../core/services/organizacion.service';
import { UiDataTableComponent, UIButtonComponent, UiStatusPillComponent } from '@agroideas/ui';
import type { TableColumn } from '@agroideas/ui';
import { AlertService } from '@agroideas/feedback';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-organizaciones',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    UiDataTableComponent, 
    UIButtonComponent, 
    UiStatusPillComponent
  ],
  templateUrl: './organizaciones.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrganizacionesComponent implements OnInit {
  private service = inject(OrganizacionService);
  private alert = inject(AlertService);
  private destroyRef = inject(DestroyRef);

  organizaciones = signal<Organizacion[]>([]);
  totalRecords = signal(0);
  loading = signal(false);
  pagina = signal(1);
  tamanioPagina = 10;

  busquedaControl = new FormControl('', { nonNullable: true });

  columns: TableColumn[] = [
    { field: 'numConvenio', header: 'Convenio', sortable: true },
    { field: 'txtNombre', header: 'Organización', sortable: true },
    { field: 'txtDepartamento', header: 'Región', sortable: true },
    { field: 'txtProvincia', header: 'Provincia', sortable: true },
    { field: 'txtDistrito', header: 'Distrito', sortable: true },
    { field: 'cantidadVisitas', header: 'Visitas', align: 'center' },
    { field: 'estado', header: 'Estado', align: 'center' }
  ];

  ngOnInit() {
    this.cargarDatos();

    this.busquedaControl.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.pagina.set(1);
        this.cargarDatos();
      });
  }

  cargarDatos() {
    this.loading.set(true);
    this.service
      .listarPaginado({
        busqueda: this.busquedaControl.value || undefined,
        pagina: this.pagina(),
        tamanioPagina: this.tamanioPagina
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.organizaciones.set(res.items);
          this.totalRecords.set(res.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.alert.toast('Error al cargar organizaciones', 'error');
        }
      });
  }

  onLazyLoad(event: { first: number; rows: number }) {
    const page = Math.floor(event.first / event.rows) + 1;
    this.pagina.set(page);
    this.cargarDatos();
  }

  sincronizar() {
    this.loading.set(true);
    this.service
      .sincronizar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.respuesta === 'OK') {
            this.alert.show('Sincronización exitosa', 'Se actualizaron las organizaciones desde SEL', 'success');
            this.pagina.set(1);
            this.cargarDatos();
          } else {
            this.loading.set(false);
            this.alert.show('Error al sincronizar', res.mensaje || '', 'error');
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.alert.show('Error al sincronizar', err.message || '', 'error');
        }
      });
  }
}
