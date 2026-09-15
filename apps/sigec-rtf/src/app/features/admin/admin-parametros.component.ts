import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../core/services/admin.service';
import { ParametroSistemaDto } from '../../core/models';
import { UIButtonComponent, ToastService } from '@agroideas/ui';

/** Orden de despliegue fijo para las 5 claves conocidas (ADR-013); cualquier clave futura que el
 *  backend agregue al maestro se muestra al final, sin requerir un cambio en este componente. */
const ORDEN_CONOCIDO = [
  'PLAZO_PRESENTACION_DIAS',
  'PLAZO_SUBSANACION_DIAS',
  'PLAZO_REEVALUACION_DIAS',
  'CORREO_OA_POR_DEFECTO',
  'CORREO_UN_CENTRAL'
];

interface FilaParametro extends ParametroSistemaDto {
  valorEditado: string;
}

@Component({
  selector: 'app-admin-parametros',
  standalone: true,
  imports: [CommonModule, RouterLink, UIButtonComponent],
  templateUrl: './admin-parametros.component.html'
})
export class AdminParametrosComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  filas = signal<FilaParametro[]>([]);
  cargando = signal(true);
  guardando = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.adminService.listarParametros().subscribe({
      next: parametros => {
        const ordenados = [...parametros].sort((a, b) => {
          const ia = ORDEN_CONOCIDO.indexOf(a.codParametro);
          const ib = ORDEN_CONOCIDO.indexOf(b.codParametro);
          return (ia === -1 ? ORDEN_CONOCIDO.length : ia) - (ib === -1 ? ORDEN_CONOCIDO.length : ib);
        });
        this.filas.set(ordenados.map(p => ({ ...p, valorEditado: p.valParametro })));
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudo cargar', 'No se pudieron cargar los parámetros del sistema.');
      }
    });
  }

  esCorreo(codParametro: string): boolean {
    return codParametro.startsWith('CORREO_');
  }

  esPlazo(codParametro: string): boolean {
    return codParametro.startsWith('PLAZO_');
  }

  actualizarValor(fila: FilaParametro, valor: string): void {
    this.filas.update(actuales =>
      actuales.map(f => (f.codParametro === fila.codParametro ? { ...f, valorEditado: valor } : f))
    );
  }

  hayCambios(): boolean {
    return this.filas().some(f => f.valorEditado !== f.valParametro);
  }

  guardarCambios(): void {
    const cambiadas = this.filas().filter(f => f.valorEditado !== f.valParametro);
    if (cambiadas.length === 0) {
      return;
    }

    this.guardando.set(true);
    forkJoin(cambiadas.map(f => this.adminService.actualizarParametro(f.codParametro, f.valorEditado))).subscribe({
      next: () => {
        this.guardando.set(false);
        this.toast.success('Parámetros actualizados', `Se actualizaron ${cambiadas.length} parámetro(s).`);
        this.cargar();
      },
      error: err => {
        this.guardando.set(false);
        const mensaje = err?.error?.mensaje || 'Verifique los valores ingresados e intente nuevamente.';
        this.toast.error('No se pudo guardar', mensaje);
      }
    });
  }
}
