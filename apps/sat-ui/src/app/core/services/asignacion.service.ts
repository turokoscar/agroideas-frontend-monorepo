import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResponseDto } from '@agroideas/utils';

export interface Asignacion {
  ideAsignacion: number;
  ideAsistente: string;
  txtAsistente: string;
  ideOrganizacion: number;
  txtOrganizacion: string;
  flgActivo: boolean;
  fecRegistro: string;
}

export interface AsignacionPayload {
  ideAsistente: string;
  ideOrganizacion: number;
  ideAsignacion?: number | null;
  flgActivo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AsignacionService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private _loading = signal(false);
  loading = this._loading.asReadonly();

  listar(): Observable<Asignacion[]> {
    this._loading.set(true);
    return this.http.get<ResponseDto<Asignacion[]>>(`${this.apiUrl}/asignaciones`).pipe(
      map(res => res.datos ?? []),
      finalize(() => this._loading.set(false))
    );
  }

  listarPorAsistente(ideAsistente: string): Observable<Asignacion[]> {
    return this.http
      .get<ResponseDto<Asignacion[]>>(`${this.apiUrl}/asignaciones/asistente/${ideAsistente}`)
      .pipe(map(res => res.datos ?? []));
  }

  crear(payload: AsignacionPayload): Observable<ResponseDto<unknown>> {
    return this.http.post<ResponseDto<unknown>>(`${this.apiUrl}/asignaciones`, payload);
  }

  actualizar(payload: AsignacionPayload): Observable<ResponseDto<unknown>> {
    return this.http.put<ResponseDto<unknown>>(`${this.apiUrl}/asignaciones`, payload);
  }

  cambiarEstado(ideAsignacion: number, nuevoEstado: boolean): Observable<ResponseDto<unknown>> {
    return this.http.patch<ResponseDto<unknown>>(
      `${this.apiUrl}/asignaciones/${ideAsignacion}/estado`,
      nuevoEstado
    );
  }

  eliminar(ideAsignacion: number): Observable<ResponseDto<unknown>> {
    return this.http.delete<ResponseDto<unknown>>(`${this.apiUrl}/asignaciones/${ideAsignacion}`);
  }
}
