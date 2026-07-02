import { Injectable, signal, computed } from '@angular/core';
import { Convenio } from '../../domain/models/convenio.model';
import { GetConvenioByIdUseCase } from '../../domain/usecases/get-convenio-by-id.usecase';

@Injectable({
  providedIn: 'root'
})
export class ConvenioStateService {
  private _convenio = signal<Convenio | null>(null);
  private _loading = signal<boolean>(false);

  // Read-only signals for components to consume
  readonly convenio = this._convenio.asReadonly();
  readonly loading = this._loading.asReadonly();

  // Derived state (Computed signals)
  readonly saldoDisponible = computed(() => {
    const c = this._convenio();
    if (!c) return 0;
    return (c.programacionAcumulada || 0) - (c.ejecucionAcumulada || 0);
  });

  readonly porcentajeEjecucion = computed(() => {
    const c = this._convenio();
    if (!c || !c.montoAprobado) return 0;
    return (c.ejecucionAcumulada || 0) / c.montoAprobado * 100;
  });

  readonly porcentajeProgramacion = computed(() => {
    const c = this._convenio();
    if (!c || !c.montoAprobado) return 0;
    return (c.programacionAcumulada || 0) / c.montoAprobado * 100;
  });

  readonly isProgramacionCompleta = computed(() => {
    return Math.round(this.porcentajeProgramacion()) >= 100;
  });

  constructor(private getConvenioByIdUseCase: GetConvenioByIdUseCase) {}

  /**
   * Updates the global convenio state by fetching fresh data from the API
   */
  refresh(id: number): void {
    this._loading.set(true);
    this.getConvenioByIdUseCase.execute(id).subscribe({
      next: (res) => {
        this._convenio.set(res);
        this._loading.set(false);
      },
      error: (err) => {
        console.error('[STATE-SVC] refresh() ERROR:', err);
        this._loading.set(false);
      }
    });
  }

  /**
   * Manually sets the convenio state
   */
  setConvenio(convenio: Convenio): void {
    this._convenio.set(convenio);
  }

  /**
   * Clears the state
   */
  clear(): void {
    this._convenio.set(null);
  }
}
