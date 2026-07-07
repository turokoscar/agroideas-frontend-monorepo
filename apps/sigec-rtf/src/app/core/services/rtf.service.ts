import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface PasoCritico {
  id: number;
  label: string;
  startMonth: number;
  endMonth: number;
  start: Date;
  end: Date;
  status: 'Aprobado' | 'Activo' | 'Pendiente' | 'Validado' | 'Vencido';
}

export interface Disbursement {
  id: string;
  item: string;
  activityId: string;
  amount: number;
  date: string;
  status: 'Ejecutado' | 'Pendiente';
}

export interface MetaFisica {
  id: string;
  activity: string;
  unit: string;
  baseline: number;
  programmed: number;
  executed: number | null;
  comments?: string;
}

export interface Indicador {
  id: string;
  name: string;
  unit: string;
  baseline: number;
  programmed: number;
  executed: number | null;
}

export interface PasoCriticoGeneralResponse {
  id: number;
  label: string;
  startMonth: number;
  endMonth: number;
  start: string;
  end: string;
  status: 'Aprobado' | 'Activo' | 'Pendiente' | 'Validado' | 'Vencido';
}

export interface DashboardData {
  convenioId: string;
  oa: string;
  budget: number;
  disbursed: number;
  durationMonths: number;
  currentMonth: number;
  activeRtfStatus: string;
  activePasoNumero: number;
  totalPasos: number;
  physicalProgress: number;
  pasos: PasoCriticoGeneralResponse[];
  disbursements: Disbursement[];
}

export interface DashboardResponse {
  respuesta: string;
  mensaje: string;
  datos: DashboardData;
}

export interface PasosCriticosResponse {
  respuesta: string;
  mensaje: string;
  datos: PasoCriticoGeneralResponse[];
}

@Injectable({
  providedIn: 'root'
})
export class RtfService {
  private http = inject(HttpClient);

  convenioId = signal('CONV-AGI-2024-0473');
  oa = signal('Cooperativa Agraria Cafetalera Norte');
  budget = signal(320000);
  disbursed = signal(47100);
  durationMonths = signal(36);
  currentMonth = signal(9);

  // Nuevas señales para el Dashboard dinámico
  activePasoNumero = signal(1);
  totalPasos = signal(6);
  physicalProgress = signal(0);

  pasos = signal<PasoCritico[]>([
    { id: 1, label: 'Paso Crítico 1', startMonth: 0, endMonth: 6, start: new Date(2025, 6, 1), end: new Date(2025, 11, 30), status: 'Aprobado' },
    { id: 2, label: 'Paso Crítico 2', startMonth: 6, endMonth: 12, start: new Date(2026, 0, 1), end: new Date(2026, 5, 30), status: 'Activo' },
    { id: 3, label: 'Paso Crítico 3', startMonth: 12, endMonth: 18, start: new Date(2026, 6, 1), end: new Date(2026, 11, 30), status: 'Pendiente' },
    { id: 4, label: 'Paso Crítico 4', startMonth: 18, endMonth: 24, start: new Date(2027, 0, 1), end: new Date(2027, 5, 30), status: 'Pendiente' },
    { id: 5, label: 'Paso Crítico 5', startMonth: 24, endMonth: 30, start: new Date(2027, 6, 1), end: new Date(2027, 11, 30), status: 'Pendiente' },
    { id: 6, label: 'Paso Crítico 6', startMonth: 30, endMonth: 36, start: new Date(2028, 0, 1), end: new Date(2028, 5, 30), status: 'Pendiente' }
  ]);

  disbursements = signal<Disbursement[]>([
    { id: 'd1', item: 'Fertilizantes Orgánicos (5 ton)', activityId: 'a2', amount: 15000, date: '2026-02-14', status: 'Ejecutado' },
    { id: 'd2', item: 'Secadores Solares (4 unidades)', activityId: 'a1', amount: 25000, date: '2026-03-09', status: 'Ejecutado' },
    { id: 'd3', item: 'Capacitación técnica BPA', activityId: 'a3', amount: 4800, date: '2026-04-22', status: 'Ejecutado' },
    { id: 'd4', item: 'Análisis de suelos laboratorio', activityId: 'a4', amount: 2300, date: '2026-05-05', status: 'Ejecutado' }
  ]);

  rtfStatus = signal<string>('PENDIENTE');
  rtfDeadlineHours = signal(12 * 24 + 4);
  observacionesUR = signal('El informe de campo requiere fotos adicionales de los secadores solares.');

  metas = signal<MetaFisica[]>([
    { id: 'a1', activity: 'Instalación de Secadores Solares', unit: 'unidad', baseline: 0, programmed: 4, executed: null },
    { id: 'a2', activity: 'Entrega de Fertilizantes Orgánicos', unit: 'ton', baseline: 0, programmed: 5, executed: null },
    { id: 'a3', activity: 'Capacitación técnica en BPA', unit: 'taller', baseline: 0, programmed: 3, executed: null },
    { id: 'a4', activity: 'Análisis de suelos', unit: 'muestra', baseline: 0, programmed: 12, executed: null }
  ]);

  indicadores = signal<Indicador[]>([
    { id: 'i1', name: 'Rendimiento', unit: 'qq/ha', baseline: 14, programmed: 18, executed: null },
    { id: 'i2', name: 'Precio de venta promedio', unit: 'S/.kg', baseline: 8.5, programmed: 11, executed: null },
    { id: 'i3', name: 'Volumen comercializado', unit: 'ton', baseline: 28, programmed: 42, executed: null }
  ]);

  loadDashboard(postulanteId: number) {
    return this.http.get<DashboardResponse>(`${environment.apiUrl}/rtfs/postulante/${postulanteId}/dashboard`).pipe(
      map(res => {
        const data = res.datos;
        if (data) {
          this.convenioId.set(data.convenioId);
          this.oa.set(data.oa);
          this.budget.set(data.budget);
          this.disbursed.set(data.disbursed);
          this.durationMonths.set(data.durationMonths);
          this.currentMonth.set(data.currentMonth);
          this.rtfStatus.set(data.activeRtfStatus);
          this.activePasoNumero.set(data.activePasoNumero);
          this.totalPasos.set(data.totalPasos);
          this.physicalProgress.set(data.physicalProgress);

          if (data.pasos) {
            this.pasos.set(data.pasos.map((p: PasoCriticoGeneralResponse) => ({
              id: p.id,
              label: p.label,
              startMonth: p.startMonth,
              endMonth: p.endMonth,
              start: new Date(p.start),
              end: new Date(p.end),
              status: p.status
            })));
          }
          if (data.disbursements) {
            this.disbursements.set(data.disbursements);
          }
        }
        return data;
      }),
      catchError(err => {
        console.error('Error loading dashboard data', err);
        return of(null);
      })
    );
  }

  loadPasosCriticos(postulanteId: number) {
    const url = `${environment.apiUrl}/rtfs/postulante/${postulanteId}/pasos-criticos`;
    this.http.get<PasosCriticosResponse>(url).pipe(
      map(res => {
        const data = res.datos;
        if (Array.isArray(data)) {
          const mapped = data.map((p: PasoCriticoGeneralResponse) => ({
            id: p.id,
            label: p.label,
            startMonth: p.startMonth,
            endMonth: p.endMonth,
            start: new Date(p.start),
            end: new Date(p.end),
            status: p.status
          }));
          this.pasos.set(mapped);
        }
        return data;
      }),
      catchError(err => {
        console.error('Error loading pasos criticos', err);
        return of([]);
      })
    ).subscribe();
  }

  updateMeta(id: string, executed: number | null, comments?: string) {
    this.metas.update(prev => prev.map(m => m.id === id ? { ...m, executed, comments } : m));
  }

  updateIndicador(id: string, executed: number | null) {
    this.indicadores.update(prev => prev.map(ind => ind.id === id ? { ...ind, executed } : ind));
  }
}
