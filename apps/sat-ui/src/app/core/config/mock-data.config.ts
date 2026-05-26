import { Organizacion, AsistenteTecnico, Actividad, Evidencia, Informe, SyncLog } from '../../shared/models/sat-data.model';

export const INITIAL_ORGANIZACIONES: Organizacion[] = [
  { id: 'org-001', nombre: 'Asociación de Productores de Quinua Andina', region: 'Puno', provincia: 'San Román', distrito: 'Juliaca', activo: true },
  { id: 'org-002', nombre: 'Cooperativa Agraria Cafetalera Valle del Sol', region: 'Junín', provincia: 'Chanchamayo', distrito: 'San Ramón', activo: true },
  { id: 'org-003', nombre: 'Asociación de Ganaderos Alto Huallaga', region: 'Huánuco', provincia: 'Leoncio Prado', distrito: 'Rupa-Rupa', activo: true },
  { id: 'org-004', nombre: 'Cooperativa de Productores de Cacao Amazónico', region: 'San Martín', provincia: 'Tocache', distrito: 'Tocache', activo: true },
  { id: 'org-005', nombre: 'Asociación de Criadores de Alpacas Cusco Sur', region: 'Cusco', provincia: 'Canchis', distrito: 'Sicuani', activo: true },
  { id: 'org-006', nombre: 'Comité de Productores de Papa Nativa', region: 'Apurímac', provincia: 'Andahuaylas', distrito: 'Andahuaylas', activo: false },
];

export const INITIAL_ASISTENTES: AsistenteTecnico[] = [
  { id: 'at-001', nombre: 'Carlos Huamán Quispe', usuario: 'chuaman', activo: true, fechaInicioVigencia: '2026-01-15', fechaFinVigencia: '2026-07-15', dispositivoId: 'DEV-A001', contacto: '951234567' },
  { id: 'at-002', nombre: 'María Elena Torres Soto', usuario: 'mtorres', activo: true, fechaInicioVigencia: '2026-02-01', fechaFinVigencia: '2026-08-01', dispositivoId: 'DEV-A002', contacto: '962345678' },
  { id: 'at-003', nombre: 'Jorge Luis Mendoza Paredes', usuario: 'jmendoza', activo: true, fechaInicioVigencia: '2026-01-01', fechaFinVigencia: '2026-06-30', dispositivoId: 'DEV-A003', contacto: '973456789' },
  { id: 'at-004', nombre: 'Ana Lucía Vargas Conde', usuario: 'avargas', activo: false, fechaInicioVigencia: '2025-07-01', fechaFinVigencia: '2025-12-31', dispositivoId: null, contacto: '984567890' },
];

export const INITIAL_ACTIVIDADES: Actividad[] = [
  { id: 'act-001', asistenteId: 'at-001', organizacionId: 'org-001', tipoIntervencion: 'capacitacion', fecha: '2026-03-10', hora: '09:00', observaciones: 'Capacitación en manejo de pastos cultivados', estadoSync: 'sincronizado', dispositivoId: 'DEV-A001' },
  { id: 'act-002', asistenteId: 'at-001', organizacionId: 'org-001', tipoIntervencion: 'visita_tecnica', fecha: '2026-03-12', hora: '08:30', observaciones: 'Visita de seguimiento a parcela demostrativa', estadoSync: 'sincronizado', dispositivoId: 'DEV-A001' },
  { id: 'act-003', asistenteId: 'at-001', organizacionId: 'org-005', tipoIntervencion: 'capacitacion', fecha: '2026-03-15', hora: '10:00', observaciones: 'Taller de esquila y clasificación de fibra', estadoSync: 'sincronizado', dispositivoId: 'DEV-A001' },
  { id: 'act-004', asistenteId: 'at-002', organizacionId: 'org-002', tipoIntervencion: 'capacitacion', fecha: '2026-03-11', hora: '08:00', observaciones: 'Control integrado de broca del café', estadoSync: 'sincronizado', dispositivoId: 'DEV-A002' },
  { id: 'act-005', asistenteId: 'at-002', organizacionId: 'org-004', tipoIntervencion: 'seguimiento', fecha: '2026-03-18', hora: '14:00', observaciones: 'Revisión de fermentadores', estadoSync: 'pendiente', dispositivoId: 'DEV-A002' },
  { id: 'act-006', asistenteId: 'at-003', organizacionId: 'org-003', tipoIntervencion: 'visita_tecnica', fecha: '2026-03-14', hora: '07:30', observaciones: 'Evaluación sanitaria del hato', estadoSync: 'sincronizado', dispositivoId: 'DEV-A003' },
  { id: 'act-007', asistenteId: 'at-003', organizacionId: 'org-003', tipoIntervencion: 'capacitacion', fecha: '2026-03-20', hora: '09:00', observaciones: 'Taller de buenas prácticas de ordeño', estadoSync: 'error', dispositivoId: 'DEV-A003' },
];

export const INITIAL_EVIDENCIAS: Evidencia[] = [
  { id: 'ev-001', actividadId: 'act-001', asistenteId: 'at-001', dispositivoId: 'DEV-A001', latitud: -15.5000, longitud: -70.1300, precisionGps: 4.2, timestampCaptura: '2026-03-10T09:15:32', rutaArchivo: '/evidencias/2026/03/at-001/act-001/20260310_091532_a3b4c5d6.jpg', hashSha256: 'a3b4...', estadoIntegridad: 'integra', estadoSync: 'sincronizado', observaciones: 'Productores en parcela demostrativa' },
  { id: 'ev-006', actividadId: 'act-006', asistenteId: 'at-003', dispositivoId: 'DEV-A003', latitud: -9.2900, longitud: -76.0000, precisionGps: 4.0, timestampCaptura: '2026-03-14T07:50:33', rutaArchivo: '...', hashSha256: 'f8a9...', estadoIntegridad: 'modificada', estadoSync: 'sincronizado', observaciones: 'Evaluación de ganado bovino' },
  { id: 'ev-007', actividadId: 'act-005', asistenteId: 'at-002', dispositivoId: 'DEV-A002', latitud: -8.3800, longitud: -76.5100, precisionGps: 8.2, timestampCaptura: '2026-03-18T14:15:00', rutaArchivo: '', hashSha256: 'a9b0...', estadoIntegridad: 'pendiente', estadoSync: 'pendiente', observaciones: 'Fermentadores revisados' },
];

export const INITIAL_INFORMES: Informe[] = [
  { id: 'inf-001', asistenteId: 'at-001', periodoInicio: '2026-03-01', periodoFin: '2026-03-31', fechaGeneracion: '2026-04-02', estado: 'generado', cantidadActividades: 3, cantidadEvidencias: 4 },
  { id: 'inf-002', asistenteId: 'at-002', periodoInicio: '2026-03-01', periodoFin: '2026-03-31', fechaGeneracion: '2026-04-05', estado: 'borrador', cantidadActividades: 1, cantidadEvidencias: 1 },
];

export const INITIAL_SYNCLOGS: SyncLog[] = [
  { id: 'sl-001', dispositivoId: 'DEV-A001', asistenteId: 'at-001', fechaHora: '2026-03-10T18:30:00', registrosEnviados: 3, resultado: 'exitoso' },
  { id: 'sl-002', dispositivoId: 'DEV-A001', asistenteId: 'at-001', fechaHora: '2026-03-12T19:00:00', registrosEnviados: 2, resultado: 'exitoso' },
  { id: 'sl-003', dispositivoId: 'DEV-A001', asistenteId: 'at-001', fechaHora: '2026-03-15T17:45:00', registrosEnviados: 2, resultado: 'exitoso' },
  { id: 'sl-004', dispositivoId: 'DEV-A002', asistenteId: 'at-002', fechaHora: '2026-03-11T20:00:00', registrosEnviados: 2, resultado: 'exitoso' },
  { id: 'sl-005', dispositivoId: 'DEV-A003', asistenteId: 'at-003', fechaHora: '2026-03-14T21:00:00', registrosEnviados: 2, resultado: 'exitoso' },
  { id: 'sl-006', dispositivoId: 'DEV-A003', asistenteId: 'at-003', fechaHora: '2026-03-20T22:00:00', registrosEnviados: 2, resultado: 'error_parcial' },
];
