import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse, ParametroSistemaDto, ReporteCumplimientoPlazosDto, ReporteProductividadUnItemDto } from '../models';

/** Panel de Administración (ADR-013) — maestro de parámetros del sistema. */
@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  parametros = signal<ParametroSistemaDto[]>([]);

  listarParametros() {
    return this.http.get<ApiResponse<ParametroSistemaDto[]>>(`${this.apiUrl}/admin/parametros-sistema`).pipe(
      tap(res => this.parametros.set(res.datos || [])),
      map(res => res.datos || []),
      catchError(err => {
        console.error('Error cargando parámetros del sistema', err);
        return throwError(() => err);
      })
    );
  }

  actualizarParametro(codParametro: string, valParametro: string) {
    return this.http.put<ApiResponse<string>>(`${this.apiUrl}/admin/parametros-sistema/${codParametro}`, { valParametro }).pipe(
      catchError(err => {
        console.error(`Error actualizando el parámetro ${codParametro}`, err);
        return throwError(() => err);
      })
    );
  }

  /** `desde`/`hasta` en formato `yyyy-MM-dd` (el que produce un `<input type="date">`). */
  obtenerReporteCumplimientoPlazos(desde: string, hasta: string) {
    return this.http.get<ApiResponse<ReporteCumplimientoPlazosDto>>(
      `${this.apiUrl}/admin/reportes/cumplimiento-plazos?desde=${desde}&hasta=${hasta}`
    ).pipe(
      map(res => res.datos),
      catchError(err => {
        console.error('Error cargando el reporte de cumplimiento de plazos', err);
        return throwError(() => err);
      })
    );
  }

  /** `desde`/`hasta` en formato `yyyy-MM-dd` (el que produce un `<input type="date">`). */
  obtenerReporteProductividadUn(desde: string, hasta: string) {
    return this.http.get<ApiResponse<ReporteProductividadUnItemDto[]>>(
      `${this.apiUrl}/admin/reportes/productividad-un?desde=${desde}&hasta=${hasta}`
    ).pipe(
      map(res => res.datos || []),
      catchError(err => {
        console.error('Error cargando el reporte de productividad UN', err);
        return throwError(() => err);
      })
    );
  }
}
