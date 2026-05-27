import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResponseDto } from '@agroideas/utils';

export interface Asistente {
  ideAsistente: string;
  txtNombres: string;
  txtApellidoPaterno: string;
  txtApellidoMaterno: string;
  txtCorreo: string;
  codUsuario: string;
  txtPasswordHash: string;
  txtRol: string;
  fecInicioVigencia: string | null;
  fecFinVigencia: string | null;
  flgActivo: boolean;
  fecRegistro?: string | null;
}

export interface AsistentePayload {
  txtNombres: string;
  txtApellidoPaterno: string;
  txtApellidoMaterno: string;
  txtCorreo: string;
  codUsuario: string;
  txtPasswordHash?: string;
  txtRol: string;
  ideAsistente?: string | null;
  fecInicioVigencia: string;
  fecFinVigencia: string;
}

export interface TipoActividad {
  ideTipoActividad: number;
  txtDescripcion: string;
}

@Injectable({ providedIn: 'root' })
export class AsistenteService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private _loading = signal(false);
  loading = this._loading.asReadonly();

  listar(): Observable<Asistente[]> {
    this._loading.set(true);
    return this.http.get<ResponseDto<Asistente[]>>(`${this.apiUrl}/asistentes`).pipe(
      map(res => res.datos ?? []),
      finalize(() => this._loading.set(false))
    );
  }

  crear(payload: AsistentePayload): Observable<ResponseDto<unknown>> {
    return this.http.post<ResponseDto<unknown>>(`${this.apiUrl}/asistentes`, payload);
  }

  actualizar(payload: AsistentePayload): Observable<ResponseDto<unknown>> {
    return this.http.put<ResponseDto<unknown>>(`${this.apiUrl}/asistentes`, payload);
  }

  cambiarEstado(ideAsistente: string, nuevoEstado: boolean): Observable<ResponseDto<unknown>> {
    return this.http.patch<ResponseDto<unknown>>(
      `${this.apiUrl}/asistentes/${ideAsistente}/estado`,
      nuevoEstado
    );
  }

  listarTiposActividad(): Observable<TipoActividad[]> {
    return this.http
      .get<ResponseDto<TipoActividad[]>>(`${this.apiUrl}/asistentes/tipos-actividad`)
      .pipe(map(res => res.datos ?? []));
  }
}
