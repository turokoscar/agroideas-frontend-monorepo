import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResponseDto } from '@agroideas/utils';

export interface Programacion {
  ideProgramacion: string;
  ideAsignacion: number;
  ideTipoActividad: number;
  fecVisitaProgramada: string;
  fecInicio?: string | null;
  fecFin?: string | null;
  txtObservacion?: string;
  txtEstado: string;
  fecCreacion: string;
  flgActivo: boolean;
  txtOrganizacion: string;
  txtTipoActividad: string;
  txtAsistente: string;
}

export interface ProgramacionPayload {
  ideAsignacion: number;
  ideTipoActividad: number;
  fecVisitaProgramada: string;
  txtObservacion: string;
  txtEstado: string;
  flgActivo: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProgramacionService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private _loading = signal(false);
  loading = this._loading.asReadonly();

  listarPorAsistente(ideAsistente: string): Observable<Programacion[]> {
    this._loading.set(true);
    return this.http
      .get<ResponseDto<Programacion[]>>(`${this.apiUrl}/programaciones/asistente/${ideAsistente}`)
      .pipe(
        map(res => res.datos ?? []),
        finalize(() => this._loading.set(false))
      );
  }

  crear(payload: ProgramacionPayload): Observable<ResponseDto<unknown>> {
    return this.http.post<ResponseDto<unknown>>(`${this.apiUrl}/programaciones`, payload);
  }

  cambiarEstado(ideProgramacion: string, nuevoEstado: string): Observable<ResponseDto<unknown>> {
    return this.http.patch<ResponseDto<unknown>>(
      `${this.apiUrl}/programaciones/${ideProgramacion}/estado`,
      nuevoEstado
    );
  }
}
