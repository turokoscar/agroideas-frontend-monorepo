import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResponseDto } from '@agroideas/utils';

export interface DashboardResumen {
  activosCount: number;
  totalAsistentes: number;
  totalEvidencias: number;
  pendientesCount: number;
  modificadasCount: number;
  totalActividades: number;
  sincronizadasCount: number;
  totalInformes: number;
  generadosCount: number;
  actividadesRecientes: ActividadReciente[];
  ultimasSincronizaciones: SyncLogResumen[];
}

export interface ActividadReciente {
  id: string;
  organizacionId: string;
  organizacionNombre: string;
  asistenteId: string;
  asistenteNombre: string;
  tipoIntervencion: string;
  fecha: string;
  estadoSync: string;
}

export interface SyncLogResumen {
  id: string;
  asistenteId: string;
  asistenteNombre: string;
  dispositivoId: string;
  registrosEnviados: number;
  fechaHora: string;
  resultado: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  obtenerResumen(): Observable<DashboardResumen> {
    return this.http
      .get<ResponseDto<DashboardResumen>>(`${this.apiUrl}/dashboards`)
      .pipe(map(res => res.datos!));
  }
}
