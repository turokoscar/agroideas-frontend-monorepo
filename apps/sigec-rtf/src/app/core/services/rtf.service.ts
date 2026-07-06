import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { forkJoin, of } from 'rxjs';
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

  rtfStatus = signal<'En Edición' | 'Enviado' | 'En Auditoría Regional' | 'Auditado en Campo' | 'Observado en Región' | 'Validado Oficialmente'>('En Edición');
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

  loadPasosCriticos(postulanteId: number, convenioId: number = 5043) {
    const generalUrl = `${environment.apiGeneral}/proyectos/${postulanteId}/pasos-criticos`;
    const rtfUrl = `${environment.apiUrl}/rtfs?ideConvenio=${convenioId}`;

    forkJoin({
      generalPasos: this.http.get<any>(generalUrl).pipe(
        map(res => res.exitoso ? res.datos : (res.datos || res)),
        catchError(() => of([]))
      ),
      rtfList: this.http.get<any>(rtfUrl).pipe(
        map(res => res.exitoso ? res.datos : (res.datos || res)),
        catchError(() => of([]))
      )
    }).subscribe(({ generalPasos, rtfList }) => {
      if (!Array.isArray(generalPasos)) return;
      
      const rtfArray = Array.isArray(rtfList) ? rtfList : [];
      const mapped = generalPasos.map((p: any) => {
        const matchedRtf = rtfArray.find((r: any) => r.numPasoCritico === p.numero);
        
        let status: 'Aprobado' | 'Activo' | 'Pendiente' | 'Validado' | 'Vencido' = 'Pendiente';
        if (matchedRtf) {
          const est = matchedRtf.estRtf.toUpperCase();
          if (est === 'APROBADO' || est === 'VALIDADO') {
            status = 'Aprobado';
          } else if (est === 'EN_EDICION' || est === 'EN_REVISION' || est === 'PENDIENTE') {
            status = 'Activo';
          } else if (est === 'VENCIDO') {
            status = 'Vencido';
          }
        } else {
          if (p.numero === 1) {
            status = 'Activo';
          }
        }

        return {
          id: p.id,
          label: `Paso Crítico ${p.numero}`,
          startMonth: p.mesInicio - 1,
          endMonth: p.mesFin,
          start: new Date(p.fechaInicio),
          end: new Date(p.fechaFin),
          status: status
        };
      });

      if (mapped.length > 0) {
        this.pasos.set(mapped);
      }
    });
  }

  updateMeta(id: string, executed: number | null, comments?: string) {
    this.metas.update(prev => prev.map(m => m.id === id ? { ...m, executed, comments } : m));
  }

  updateIndicador(id: string, executed: number | null) {
    this.indicadores.update(prev => prev.map(ind => ind.id === id ? { ...ind, executed } : ind));
  }
}
