import { Injectable, signal } from '@angular/core';
import { 
  AsistenteTecnico, 
  Organizacion, 
  Actividad, 
  Evidencia, 
  Informe, 
  SyncLog,
  TipoIntervencion 
} from '../../shared/models/sat-data.model';
import { 
  INITIAL_ORGANIZACIONES, 
  INITIAL_ASISTENTES, 
  INITIAL_ACTIVIDADES, 
  INITIAL_EVIDENCIAS, 
  INITIAL_INFORMES, 
  INITIAL_SYNCLOGS 
} from '../config/mock-data.config';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  organizaciones = signal<Organizacion[]>(INITIAL_ORGANIZACIONES);
  asistentes = signal<AsistenteTecnico[]>(INITIAL_ASISTENTES);
  actividades = signal<Actividad[]>(INITIAL_ACTIVIDADES);
  evidencias = signal<Evidencia[]>(INITIAL_EVIDENCIAS);
  informes = signal<Informe[]>(INITIAL_INFORMES);
  syncLogs = signal<SyncLog[]>(INITIAL_SYNCLOGS);

  getAsistenteNombre(id: string): string {
    return this.asistentes().find(a => a.id === id)?.nombre ?? 'Desconocido';
  }

  getOrganizacionNombre(id: string): string {
    return this.organizaciones().find(o => o.id === id)?.nombre ?? 'Desconocida';
  }

  getTipoIntervencionLabel(t: TipoIntervencion): string {
    const map: Record<TipoIntervencion, string> = {
      capacitacion: 'Capacitación',
      visita_tecnica: 'Visita Técnica',
      seguimiento: 'Seguimiento',
    };
    return map[t];
  }
}

