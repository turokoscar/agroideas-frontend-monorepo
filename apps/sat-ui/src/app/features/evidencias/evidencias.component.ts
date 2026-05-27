import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, computed, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { EvidenciaService, EvidenciaFiltro, EvidenciaListadoItem, EvidenciaValidacion } from '../../core/services/evidencia.service';
import { EvidenciaCardComponent } from './components/evidencia-card/evidencia-card.component';
import { EvidenciaDetalleModalComponent } from './components/evidencia-detalle-modal/evidencia-detalle-modal.component';
import { UIButtonComponent } from '@agroideas/ui';

@Component({
  selector: 'app-evidencias',
  standalone: true,
  imports: [CommonModule, FormsModule, EvidenciaCardComponent, EvidenciaDetalleModalComponent, UIButtonComponent],
  templateUrl: './evidencias.component.html',
  styles: [`
    :host {
      display: block;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EvidenciasComponent implements OnInit {
  private authService = inject(AuthService);
  private evidenciaService = inject(EvidenciaService);
  private destroyRef = inject(DestroyRef);

  userRole = computed(() => this.authService.user()?.role ?? 'TECNICO');

  evidencias = signal<EvidenciaListadoItem[]>([]);
  evidenciaSeleccionada = signal<EvidenciaListadoItem | null>(null);
  validacion = signal<EvidenciaValidacion | null>(null);
  loading = this.evidenciaService.loading;
  total = signal(0);
  paginaActual = signal(1);
  tamanioPagina = 20;

  filtro: EvidenciaFiltro = {
    pagina: 1,
    tamanioPagina: this.tamanioPagina
  };

  ngOnInit() {
    this.recargar();
  }

  onFiltroChange() {
    this.paginaActual.set(1);
    this.filtro.pagina = 1;
    this.recargar();
  }

  limpiarFiltros() {
    this.filtro = {
      pagina: 1,
      tamanioPagina: this.tamanioPagina
    };
    this.paginaActual.set(1);
    this.recargar();
  }

  recargar() {
    this.evidenciaService.listar(this.filtro)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => {
        this.evidencias.set(res.items);
        this.total.set(res.total);
      },
      error: (err) => {
        console.error('Error cargando evidencias:', err);
      }
    });
  }

  paginaAnterior() {
    if (this.paginaActual() > 1) {
      this.paginaActual.update(p => p - 1);
      this.filtro.pagina = this.paginaActual();
      this.recargar();
    }
  }

  paginaSiguiente() {
    this.paginaActual.update(p => p + 1);
    this.filtro.pagina = this.paginaActual();
    this.recargar();
  }

  abrirDetalle(ev: EvidenciaListadoItem) {
    this.evidenciaSeleccionada.set(ev);
    this.validacion.set(null);
  }

  cerrarDetalle() {
    this.evidenciaSeleccionada.set(null);
    this.validacion.set(null);
  }

  validarIntegridad() {
    const ev = this.evidenciaSeleccionada();
    if (!ev) return;

    this.evidenciaService.validarIntegridad(ev.ideEvidencia)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => {
        if (res) {
          this.validacion.set(res);
        }
      },
      error: (err) => {
        console.error('Error validando integridad:', err);
      }
    });
  }
}