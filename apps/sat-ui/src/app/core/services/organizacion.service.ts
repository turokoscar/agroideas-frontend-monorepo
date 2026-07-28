import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, finalize, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResponseDto } from '@agroideas/utils';

export interface Organizacion {
  ideOrganizacion: number;
  txtNombre: string;
  numeroConvenio: string;
  codUbigeo?: string;
  txtDepartamento?: string;
  txtProvincia?: string;
  txtDistrito?: string;
}

export interface OrganizacionFiltro {
  busqueda?: string;
}

@Injectable({ providedIn: 'root' })
export class OrganizacionService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private _loading = signal(false);
  loading = this._loading.asReadonly();

  private construirParams(filtro: OrganizacionFiltro): HttpParams {
    let params = new HttpParams();
    if (filtro.busqueda) params = params.set('busqueda', filtro.busqueda);
    return params;
  }

  listar(filtro: OrganizacionFiltro = {}): Observable<Organizacion[]> {
    this._loading.set(true);
    const params = this.construirParams(filtro);
    return this.http
      .get<ResponseDto<Organizacion[]>>(`${this.apiUrl}/organizaciones`, { params })
      .pipe(
        map(res => res.datos ?? []),
        finalize(() => this._loading.set(false))
      );
  }
}
