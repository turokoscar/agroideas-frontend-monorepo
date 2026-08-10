import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  RtfCabeceraDto,
  UrEvaluacionItemDto,
  DashboardUnData,
  ApiResponse
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class UnGabineteService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // UN State Signals
  unRtfList = signal<RtfCabeceraDto[]>([]);
  unSelectedRtfId = signal<number | null>(null);
  unEvaluacionItems = signal<UrEvaluacionItemDto[]>([]);
  unObservacionDevolver = signal<string>('');
  dashboardUnData = signal<DashboardUnData | null>(null);
  rtfStatus = signal<string>('PENDIENTE');

  loadDashboardUn() {
    return this.http.get<ApiResponse<DashboardUnData>>(`${this.apiUrl}/rtfs/dashboard-un`).pipe(
      map(res => {
        this.dashboardUnData.set(res.datos || null);
        return res.datos;
      }),
      catchError(err => {
        console.error('Error loading UN dashboard', err);
        return throwError(() => err);
      })
    );
  }

  loadBandejaUn() {
    return this.http.get<ApiResponse<{ total: number; items: RtfCabeceraDto[] }>>(`${this.apiUrl}/rtfs/bandeja/un`).pipe(
      map(res => {
        this.unRtfList.set(res.datos?.items || []);
        return res.datos;
      }),
      catchError(err => {
        console.error('Error loading UN bandeja', err);
        return throwError(() => err);
      })
    );
  }

  aprobarUn(rtfId: number, observacion?: string) {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/aprobar-un`, observacion ? JSON.stringify(observacion) : {}, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(res => {
        this.rtfStatus.set('APROBADO');
        this.unSelectedRtfId.set(null);
        return res;
      }),
      catchError(err => {
        console.error('Error approving RTF from UN', err);
        return throwError(() => err);
      })
    );
  }

  rechazarUn(rtfId: number, observacion?: string) {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/rechazar-un`, observacion ? JSON.stringify(observacion) : {}, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(res => {
        this.rtfStatus.set('RECHAZADO');
        this.unSelectedRtfId.set(null);
        return res;
      }),
      catchError(err => {
        console.error('Error rejecting RTF from UN', err);
        return throwError(() => err);
      })
    );
  }

  devolverUn(rtfId: number, observacion: string) {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/devolver-un`, JSON.stringify(observacion), {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(res => {
        this.rtfStatus.set('EN_EDICION');
        this.unSelectedRtfId.set(null);
        return res;
      }),
      catchError(err => {
        console.error('Error devolviendo RTF desde UN', err);
        return throwError(() => err);
      })
    );
  }
}
