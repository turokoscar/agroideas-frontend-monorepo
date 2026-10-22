import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse, DatosPaginados } from '../models/api.model';
import { CierreRol, ROLES_PERSONAL } from '../models/rol-cierre.model';
import { desenvolver } from './cierre-api.service';

/** Convenio de `GET convenios/{asignados|todos}` de sel-api-general (solo los campos que usa Cierre). */
export interface ConvenioSelDto {
  /** postulanteId: el `ideConvenio` del módulo. */
  id: number;
  numeroConvenio: string;
  ruc: string;
  razonSocial: string;
  fechaFirma: string | null;
}

/**
 * La cartera limita la búsqueda solo si el único rol del personal es la UN, con la misma regla que
 * `ICarteraDelUsuario` de sigec-api-cierre: el Jefe de la UN, el Administrador o quien tiene varios roles ve todos.
 */
export function buscaEnCartera(roles: readonly CierreRol[]): boolean {
  const personal = roles.filter(r => ROLES_PERSONAL.includes(r));
  return personal.length === 1 && personal[0] === 'UN';
}

/**
 * Búsqueda de convenios en sel-api-general, con el JWT de la sesión (mismo emisor que sel-api-seguridad). El SEL busca
 * por coincidencia parcial en el RUC y la razón social de la OA (`GENERAL.SEL_SP_R_ListarConvenioCartera`), no en el
 * número de convenio: ampliarlo es una decisión pendiente del SEL (ADR 0014, Fase 1).
 */
@Injectable({ providedIn: 'root' })
export class ConvenioSelService {
  private http = inject(HttpClient);
  private apiGeneral = environment.apiGeneral;

  buscar(texto: string, roles: readonly CierreRol[]): Observable<ConvenioSelDto[]> {
    const ruta = buscaEnCartera(roles) ? 'asignados' : 'todos';
    const params = new HttpParams()
      .set('busqueda', texto.trim())
      .set('pagina', 1)
      .set('cantidad', environment.busquedaConvenios.cantidadSugerencias);
    return this.http
      .get<ApiResponse<DatosPaginados<ConvenioSelDto>>>(`${this.apiGeneral}/convenios/${ruta}`, { params })
      .pipe(
        desenvolver(),
        map(pagina => pagina?.items ?? [])
      );
  }
}
