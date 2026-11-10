import { Injectable, signal, computed } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Convenio } from '../../domain/models/convenio.model';
import { GetConvenioByIdUseCase } from '../../domain/usecases/get-convenio-by-id.usecase';

@Injectable({
  providedIn: 'root'
})
export class ConvenioStateService {
  private _convenio = signal<Convenio | null>(null);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Read-only signals for components to consume
  readonly convenio = this._convenio.asReadonly();
  readonly loading = this._loading.asReadonly();
  /** Mensaje de la última carga fallida (el de la API si lo trae), o null. */
  readonly error = this._error.asReadonly();

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
   * Carga el convenio desde la API. Al recargar el mismo convenio (p. ej. tras registrar un
   * desembolso) se conserva el que está en pantalla mientras llega el nuevo; al cambiar de
   * convenio se descarta el anterior, para que una carga fallida no deje otro convenio visible.
   */
  refresh(id: number): void {
    if (this._convenio()?.id !== id) {
      this._convenio.set(null);
    }
    this._error.set(null);
    this._loading.set(true);
    this.getConvenioByIdUseCase.execute(id).subscribe({
      next: (res) => {
        this._convenio.set(res);
        this._loading.set(false);
      },
      error: (err: unknown) => {
        // 403 (convenio fuera de la cartera) o 404: el convenio en pantalla ya no es válido.
        const status = err instanceof HttpErrorResponse ? err.status : undefined;
        if (status === 403 || status === 404) {
          this._convenio.set(null);
        }
        this._error.set(ConvenioStateService.mensajeError(err));
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
    this._error.set(null);
  }

  private static mensajeError(err: unknown): string {
    const mensaje = err instanceof HttpErrorResponse ? err.error?.mensaje : undefined;
    return typeof mensaje === 'string' && mensaje.trim() ? mensaje : 'No se pudo cargar el convenio.';
  }
}
