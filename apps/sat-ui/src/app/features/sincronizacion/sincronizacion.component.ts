import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, computed, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiKpiComponent, UIButtonComponent } from '@agroideas/ui';
import { SyncService, SyncLogFiltro, SyncLogDto } from '../../core/services/sync.service';
import { SyncFiltersComponent } from './components/sync-filters/sync-filters.component';
import { SyncHistoryTableComponent } from './components/sync-history-table/sync-history-table.component';

@Component({
  selector: 'app-sincronizacion',
  standalone: true,
  imports: [CommonModule, FormsModule, UiKpiComponent, UIButtonComponent, SyncFiltersComponent, SyncHistoryTableComponent],
  templateUrl: './sincronizacion.component.html',
  styles: [`
    :host {
      display: block;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SincronizacionComponent implements OnInit {
  private syncService = inject(SyncService);
  private destroyRef = inject(DestroyRef);

  sincronizaciones = signal<SyncLogDto[]>([]);
  loading = this.syncService.loading;
  total = signal(0);
  paginaActual = signal(1);
  tamanioPagina = 20;

  exitosas = computed(() => this.sincronizaciones().filter(s => s.txtResultado === 'EXITOSO').length);
  errorParcial = computed(() => this.sincronizaciones().filter(s => s.txtResultado === 'ERROR_PARCIAL').length);
  fallidas = computed(() => this.sincronizaciones().filter(s => s.txtResultado === 'FALLIDO').length);

  filtro: SyncLogFiltro = {
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
    this.syncService.obtenerHistorial(this.filtro)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => {
        this.sincronizaciones.set(res.items);
        this.total.set(res.total);
      },
      error: (err) => {
        console.error('Error cargando sincronizaciones:', err);
      }
    });
  }

  onLazyLoad(event: { first: number, rows: number }) {
    const page = Math.floor(event.first / event.rows) + 1;
    this.paginaActual.set(page);
    this.filtro.pagina = page;
    this.recargar();
  }
}