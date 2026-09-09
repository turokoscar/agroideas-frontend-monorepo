import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription, interval, of } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse, NotificacionDto } from '../models';

/**
 * Notificaciones in-app (Fase 6): la OA ve las suyas (filtradas por su convenio en el backend);
 * la UN ve un feed compartido de todo el equipo — no hay destinatario individual, el backend
 * resuelve cuál de los dos corresponde a partir del rol del token.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificacionService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  notificaciones = signal<NotificacionDto[]>([]);
  noLeidas = signal(0);

  private pollingSub: Subscription | null = null;

  cargarNotificaciones(limite = 30) {
    return this.http.get<ApiResponse<NotificacionDto[]>>(`${this.apiUrl}/notificaciones?limite=${limite}`).pipe(
      map(res => {
        const items = res.datos ?? [];
        this.notificaciones.set(items);
        return items;
      }),
      catchError(err => {
        console.error('Error cargando notificaciones', err);
        return of([]);
      })
    );
  }

  cargarNoLeidas() {
    return this.http.get<ApiResponse<{ total: number }>>(`${this.apiUrl}/notificaciones/no-leidas`).pipe(
      map(res => {
        const total = res.datos?.total ?? 0;
        this.noLeidas.set(total);
        return total;
      }),
      catchError(err => {
        console.error('Error cargando el conteo de notificaciones no leídas', err);
        return of(0);
      })
    );
  }

  marcarLeida(ideNotificacion: number) {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/notificaciones/${ideNotificacion}/leida`, {}).pipe(
      map(res => {
        this.notificaciones.update(items =>
          items.map(n => (n.ideNotificacion === ideNotificacion ? { ...n, estLeida: true } : n))
        );
        this.noLeidas.update(n => Math.max(0, n - 1));
        return res.datos;
      }),
      catchError(err => {
        console.error('Error marcando la notificación como leída', err);
        return of(null);
      })
    );
  }

  /** Refresca el contador no leídas de inmediato y luego cada `intervaloMs` (60s por defecto). */
  iniciarPolling(intervaloMs = 60000) {
    this.detenerPolling();
    this.pollingSub = interval(intervaloMs)
      .pipe(
        startWith(0),
        switchMap(() => this.cargarNoLeidas())
      )
      .subscribe();
  }

  detenerPolling() {
    this.pollingSub?.unsubscribe();
    this.pollingSub = null;
  }
}
