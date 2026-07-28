import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, finalize, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResponseDto } from '@agroideas/utils';

export interface Organizacion {
  ideOrganizacion: number;
  txtNombre: string;
  numConvenio: string;
  codUbigeo?: string;
  txtDepartamento?: string;
  txtProvincia?: string;
  txtDistrito?: string;
  cantidadVisitas?: number;
}

export interface OrganizacionFiltro {
  busqueda?: string;
  pagina?: number;
  tamanioPagina?: number;
}

export interface OrganizacionPaginado {
  items: Organizacion[];
  total: number;
  pagina: number;
  tamanioPagina: number;
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

  listarPaginado(filtro: OrganizacionFiltro = {}): Observable<OrganizacionPaginado> {
    this._loading.set(true);
    let params = new HttpParams();
    if (filtro.busqueda) params = params.set('busqueda', filtro.busqueda);
    if (filtro.pagina) params = params.set('pagina', filtro.pagina.toString());
    if (filtro.tamanioPagina) params = params.set('tamanioPagina', filtro.tamanioPagina.toString());

    return this.http
      .get<ResponseDto<OrganizacionPaginado>>(`${this.apiUrl}/organizaciones`, { params })
      .pipe(
        map(res => res.datos!),
        finalize(() => this._loading.set(false))
      );
  }

  sincronizar(): Observable<ResponseDto<unknown>> {
    return this.http.post<ResponseDto<unknown>>(`${this.apiUrl}/organizaciones/sincronizacion`, {});
  }
}
