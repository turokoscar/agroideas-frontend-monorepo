import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Observable, Subscription, interval } from 'rxjs';
import { catchError, map, startWith, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse, DatosPaginados } from '../models/api.model';
import { NotificacionDto } from '../models/notificacion.model';
import { desenvolver } from './cierre-api.service';

/**
 * Bandeja in-app de Cierre (`GET/PUT /notificaciones`). La API resuelve el actor por el rol del
 * token y limita a la OA a su convenio. No hay endpoint de conteo: el total de no leídas sale de
 * `soloNoLeidas=true&cantidad=1` (el `total` de `DatosPaginados`).
 */
@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/notificaciones`;
  private config = environment.notificaciones;

  notificaciones = signal<NotificacionDto[]>([]);
  noLeidas = signal(0);

  private polling: Subscription | null = null;

  listar(cantidad = this.config.cantidadEnCampana): Observable<NotificacionDto[]> {
    const params = new HttpParams().set('pagina', 1).set('cantidad', cantidad);
    return this.http.get<ApiResponse<DatosPaginados<NotificacionDto>>>(this.apiUrl, { params }).pipe(
      desenvolver(),
      map(datos => datos.items),
      tap(items => this.notificaciones.set(items))
    );
  }

  contarNoLeidas(): Observable<number> {
    const params = new HttpParams().set('soloNoLeidas', true).set('pagina', 1).set('cantidad', 1);
    return this.http.get<ApiResponse<DatosPaginados<NotificacionDto>>>(this.apiUrl, { params }).pipe(
      desenvolver(),
      map(datos => datos.total),
      tap(total => this.noLeidas.set(total))
    );
  }

  marcarLeida(ideNotificacion: number): Observable<NotificacionDto> {
    return this.http.put<ApiResponse<NotificacionDto>>(`${this.apiUrl}/${ideNotificacion}`, { leida: true }).pipe(
      desenvolver(),
      tap(actualizada => {
        this.notificaciones.update(items => items.map(n => (n.ideNotificacion === ideNotificacion ? actualizada : n)));
        this.noLeidas.update(n => Math.max(0, n - 1));
      })
    );
  }

  /** Refresca el contador cada `intervaloRefrescoMs`. Un fallo se ignora: el siguiente ciclo lo reintenta. */
  iniciarPolling(): void {
    if (this.polling) return;
    this.polling = interval(this.config.intervaloRefrescoMs)
      .pipe(
        startWith(0),
        switchMap(() => this.contarNoLeidas().pipe(catchError(() => EMPTY)))
      )
      .subscribe();
  }

  detenerPolling(): void {
    this.polling?.unsubscribe();
    this.polling = null;
  }
}
