export interface AsistenteTecnico {
  id: string;
  nombre: string;
  usuario: string;
  activo: boolean;
  fechaInicioVigencia: string;
  fechaFinVigencia: string;
  dispositivoId: string | null;
  contacto: string;
}

export interface Organizacion {
  id: string;
  nombre: string;
  region: string;
  provincia: string;
  distrito: string;
  activo: boolean;
}

export type TipoIntervencion = 'capacitacion' | 'visita_tecnica' | 'seguimiento';
export type EstadoSync = 'pendiente' | 'sincronizado' | 'error';
export type EstadoIntegridad = 'integra' | 'modificada' | 'pendiente';
export type EstadoInforme = 'borrador' | 'generado' | 'presentado';

export interface Actividad {
  id: string;
  asistenteId: string;
  organizacionId: string;
  tipoIntervencion: TipoIntervencion;
  fecha: string;
  hora: string;
  observaciones: string;
  estadoSync: EstadoSync;
  dispositivoId: string;
}

export interface Evidencia {
  id: string;
  actividadId: string;
  asistenteId: string;
  dispositivoId: string;
  latitud: number;
  longitud: number;
  precisionGps: number;
  timestampCaptura: string;
  rutaArchivo: string;
  hashSha256: string;
  estadoIntegridad: EstadoIntegridad;
  estadoSync: EstadoSync;
  observaciones: string;
}

export interface Informe {
  id: string;
  asistenteId: string;
  periodoInicio: string;
  periodoFin: string;
  fechaGeneracion: string;
  estado: EstadoInforme;
  cantidadActividades: number;
  cantidadEvidencias: number;
}

export interface SyncLog {
  id: string;
  dispositivoId: string;
  asistenteId: string;
  fechaHora: string;
  registrosEnviados: number;
  resultado: 'exitoso' | 'error_parcial' | 'fallido';
}
