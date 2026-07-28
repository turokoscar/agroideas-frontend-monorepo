import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { ResponseDto, STORAGE_KEYS } from '@agroideas/utils';

export interface EvidenciaFiltro {
  ideAsistente?: string;
  fecInicio?: string;
  fecFin?: string;
  ideOrganizacion?: number;
  ideTipoActividad?: number;
  pagina?: number;
  tamanioPagina?: number;
}

export interface EvidenciaListadoItem {
  ideEvidencia: string;
  ideActividad: string;
  txtNombreArchivo: string;
  txtPathArchivo: string;
  txtHashSha256: string;
  fecCaptura: string;
  numLatitud: number | null;
  numLongitud: number | null;
  numPrecision: number | null;
  txtAsistente: string;
  txtOrganizacion: string;
  txtTipoActividad: string;
  ideArchivo?: string;
}

export interface EvidenciaDetalle extends EvidenciaListadoItem {
  flgSincronizado: boolean;
  fecRegistro: string;
  txtObservaciones: string;
}

export interface EvidenciaValidacion {
  ideEvidencia: string;
  txtHashSha256: string;
  txtHashCalculado: string | null;
  flgIntegro: boolean;
  txtPathArchivo: string;
}

export interface EvidenciaArchivo {
  contenido: Blob;
  nombreArchivo: string;
  contentType: string;
}

export interface EvidenciaPaginacion {
  items: EvidenciaListadoItem[];
  total: number;
  pagina: number;
  tamanioPagina: number;
}

@Injectable({
  providedIn: 'root'
})
export class EvidenciaService {
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  private apiUrl = environment.apiUrl;

  private _loading = signal(false);
  loading = this._loading.asReadonly();

  obtenerUrlArchivo(id: string): string {
    const token = localStorage.getItem(STORAGE_KEYS.SAT_TOKEN);
    if (token) {
      return `${this.apiUrl}/evidencias/${id}/archivo?token=${encodeURIComponent(token)}`;
    }
    return `${this.apiUrl}/evidencias/${id}/archivo`;
  }

  private construirParams(filtro: EvidenciaFiltro): HttpParams {
    let params = new HttpParams();
    if (filtro.ideAsistente) params = params.set('ideAsistente', filtro.ideAsistente);
    if (filtro.fecInicio) params = params.set('fecInicio', filtro.fecInicio);
    if (filtro.fecFin) params = params.set('fecFin', filtro.fecFin);
    if (filtro.ideOrganizacion) params = params.set('ideOrganizacion', filtro.ideOrganizacion.toString());
    if (filtro.ideTipoActividad) params = params.set('ideTipoActividad', filtro.ideTipoActividad.toString());
    params = params.set('pagina', (filtro.pagina ?? 1).toString());
    params = params.set('tamanioPagina', (filtro.tamanioPagina ?? 20).toString());
    return params;
  }

  listar(filtro: EvidenciaFiltro = {}): Observable<EvidenciaPaginacion> {
    this._loading.set(true);
    const params = this.construirParams(filtro);
    return this.http.get<ResponseDto>(`${this.apiUrl}/evidencias`, { params }).pipe(
      map(res => {
        this._loading.set(false);
        if (res.respuesta === 'OK' && res.datos) {
          return res.datos as EvidenciaPaginacion;
        }
        return { items: [], total: 0, pagina: 1, tamanioPagina: 20 };
      })
    );
  }

  obtenerDetalle(id: string): Observable<EvidenciaDetalle | null> {
    return this.http.get<ResponseDto>(`${this.apiUrl}/evidencias/${id}`).pipe(
      map(res => res.respuesta === 'OK' ? res.datos as EvidenciaDetalle : null)
    );
  }

  obtenerArchivo(id: string): Observable<EvidenciaArchivo> {
    return this.http.get(`${this.apiUrl}/evidencias/${id}/archivo`, { responseType: 'blob' }).pipe(
      map(blob => ({
        contenido: blob,
        nombreArchivo: this.extraerNombreDeBlob(blob, id),
        contentType: blob.type || 'image/jpeg'
      }))
    );
  }

  private extraerNombreDeBlob(blob: Blob, id: string): string {
    const contentDisposition = blob instanceof Blob ? (blob as any).name : null;
    return contentDisposition || `${id}.jpg`;
  }

  validarIntegridad(id: string): Observable<EvidenciaValidacion | null> {
    return this.http.get<ResponseDto>(`${this.apiUrl}/evidencias/${id}/validar`).pipe(
      map(res => res.respuesta === 'OK' ? res.datos as EvidenciaValidacion : null)
    );
  }
}