import type { StatusTone } from '@agroideas/ui';
/**
 * Espejo de los DTO de `SIGEC_CIERRE.Entidad/Cierre` (JSON en camelCase). Las fechas llegan como
 * texto ISO sin zona: son hora de Perú (`IReloj.Ahora` de la API).
 */

/** `EstadoCierre`. Las transiciones viven en `MaquinaEstadosCierre` de la API. */
export type EstadoCierre =
  | 'ESPERA_ANEXO20'
  | 'EN_VERIFICACION'
  | 'EN_EVALUACION_UN'
  | 'DERIVADO_DE'
  | 'EN_REVISION_UAJ'
  | 'OBSERVADO_UAJ'
  | 'PROYECTO_RDE_REMITIDO'
  | 'CERRADO';

export const ESTADOS_CIERRE: readonly EstadoCierre[] = [
  'ESPERA_ANEXO20',
  'EN_VERIFICACION',
  'EN_EVALUACION_UN',
  'DERIVADO_DE',
  'EN_REVISION_UAJ',
  'OBSERVADO_UAJ',
  'PROYECTO_RDE_REMITIDO',
  'CERRADO'
];

export const ETIQUETA_ESTADO: Readonly<Record<EstadoCierre, string>> = {
  ESPERA_ANEXO20: 'Espera del Anexo 20',
  EN_VERIFICACION: 'En verificación de campo',
  EN_EVALUACION_UN: 'En evaluación de la UN',
  DERIVADO_DE: 'En la Dirección Ejecutiva',
  EN_REVISION_UAJ: 'En revisión legal',
  OBSERVADO_UAJ: 'Observado por la UAJ',
  PROYECTO_RDE_REMITIDO: 'Proyecto de RDE remitido',
  CERRADO: 'Cerrado'
};

/** Tono visual del estado: clases de los tokens de `@agroideas/theme`. */
/** Tono de la insignia de `app-ui-status-pill` para cada estado del expediente. */
export function tonoEstado(estado: string): StatusTone {
  switch (estado as EstadoCierre) {
    case 'CERRADO':
      return 'success';
    case 'OBSERVADO_UAJ':
      return 'warning';
    case 'ESPERA_ANEXO20':
      return 'neutral';
    default:
      return 'primary';
  }
}

export function etiquetaEstado(estado: string): string {
  return ETIQUETA_ESTADO[estado as EstadoCierre] ?? estado;
}

/** `TipoDocumentoCierre`. */
export type TipoDocumentoCierre =
  | 'ANEXO_20'
  | 'ANEXO_21'
  | 'ANEXO_22'
  | 'INFORME_LEGAL'
  | 'PROYECTO_RDE'
  | 'RDE'
  | 'CARGO_NOTIFICACION_RDE';

export const ETIQUETA_DOCUMENTO: Readonly<Record<TipoDocumentoCierre, string>> = {
  ANEXO_20: 'Informe de Cierre del PNT (Anexo 20)',
  ANEXO_21: 'Acta de Cierre (Anexo 21)',
  ANEXO_22: 'Informe de Evaluación (Anexo 22)',
  INFORME_LEGAL: 'Informe Legal',
  PROYECTO_RDE: 'Proyecto de RDE',
  RDE: 'Resolución Directoral Ejecutiva',
  CARGO_NOTIFICACION_RDE: 'Cargo de notificación de la RDE'
};

export function etiquetaDocumento(tipo: string): string {
  return ETIQUETA_DOCUMENTO[tipo as TipoDocumentoCierre] ?? tipo;
}

/** `OrigenCierre`: quién abrió el expediente. */
export const ETIQUETA_ORIGEN: Readonly<Record<string, string>> = {
  EVENTO_RTF: 'Aviso del último RTF',
  MANUAL: 'Apertura manual de la UN',
  RESPALDO: 'Proceso de respaldo'
};

export interface CierreDto {
  ideCierreConvenio: number;
  /** postulanteId de BD_SEL. */
  ideConvenio: number;
  estCierre: EstadoCierre;
  fecInicio: string;
  fecDerivacionDE: string | null;
  txtContingencia: string | null;
  fecDerivacionUAJ: string | null;
  fecCierreFormal: string | null;
  txtNumeroConvenio: string | null;
  txtOrganizacion: string | null;
  codUbigeo: string | null;
  fecFinVigencia: string | null;
  /** Fecha de firma del convenio: su año forma el número "NNNN-AAAA-ST". */
  fecFirmaConvenio: string | null;
  idePasoCriticoUltimo: number | null;
  ideRtfUltimo: number | null;
  fecPresentacionUltimoRtf: string | null;
  fecRecepcionAnexo20: string | null;
  flgDeOficio: boolean;
  tipOrigen: string | null;
  fecVerificacionCampo: string | null;
  fecRemisionProyectoRde: string | null;
  txtNumeroRde: string | null;
  fecEmisionRde: string | null;
  ideUsuarioCierre: number | null;
  /** Estado 77 en BD_SEL: null si no está cerrado, false pendiente, true registrado. */
  flgSelSincronizado: boolean | null;
  fecSelSincronizado: string | null;
  canIntentosSel: number;
  txtErrorSel: string | null;
}

export interface DocumentoCierreDto {
  ideDocumento: number;
  ideCierreConvenio: number;
  tipDocumento: TipoDocumentoCierre;
  codArchivo: string;
  txtNombreArchivo: string;
  ideUsuario: number;
  fecRegistro: string;
}

export interface CierreDetalleDto extends CierreDto {
  documentos: DocumentoCierreDto[];
}

export interface AuditoriaCierreDto {
  ideAuditoria: number;
  ideCierreConvenio: number;
  txtAccion: string;
  txtDetalle: string;
  ideUsuario: number;
  fecRegistro: string;
}

/** `SemaforoPlazo`. */
export type SemaforoPlazo = 'VENCIDO' | 'POR_VENCER' | 'EN_PLAZO' | 'SIN_PLAZO';

export const SEMAFOROS: readonly SemaforoPlazo[] = ['VENCIDO', 'POR_VENCER', 'EN_PLAZO', 'SIN_PLAZO'];

export const ETIQUETA_SEMAFORO: Readonly<Record<SemaforoPlazo, string>> = {
  VENCIDO: 'Vencido',
  POR_VENCER: 'Por vencer',
  EN_PLAZO: 'En plazo',
  SIN_PLAZO: 'Sin plazo'
};

export function claseSemaforo(semaforo: SemaforoPlazo): string {
  switch (semaforo) {
    case 'VENCIDO':
      return 'text-destructive';
    case 'POR_VENCER':
      return 'text-warning';
    case 'EN_PLAZO':
      return 'text-success';
    default:
      return 'text-muted-foreground';
  }
}

/** Expediente de `GET /cierres/pendientes`. */
export interface ExpedientePendienteDto {
  ideCierreConvenio: number;
  ideConvenio: number;
  estCierre: EstadoCierre;
  fecInicio: string;
  txtNumeroConvenio: string | null;
  fecFirmaConvenio: string | null;
  txtOrganizacion: string | null;
  flgDeOficio: boolean;
  flgSelSincronizado: boolean | null;
  tipPlazo: string | null;
  fecLimitePlazo: string | null;
  /** Días calendario hasta el vencimiento (negativo si venció), o null sin plazo. */
  numDiasRestantes: number | null;
  tipSemaforo: SemaforoPlazo;
  /** Nombres de `AccionCierre` que el usuario puede ejecutar en el estado actual. */
  acciones: string[];
}

/** Nombres de `AccionCierre` (enum de `MaquinaEstadosCierre`), como los serializa la API. */
export const ETIQUETA_ACCION: Readonly<Record<string, string>> = {
  IniciarCierre: 'Iniciar expediente',
  PresentarAnexo20: 'Presentar Anexo 20',
  RegistrarVerificacionCampo: 'Registrar acta',
  DerivarDe: 'Derivar a la DE',
  TrasladarUaj: 'Trasladar a la UAJ',
  ObservarUaj: 'Observar',
  SubsanarYElevarDe: 'Subsanar observaciones',
  RemitirProyectoRde: 'Remitir Proyecto de RDE',
  SuscribirRde: 'Cargar RDE',
  RegistrarCargoNotificacion: 'Registrar cargo de notificación'
};

export function etiquetaAccion(accion: string): string {
  return ETIQUETA_ACCION[accion] ?? accion;
}

export interface ListarCierresFiltro {
  ideConvenio?: number | null;
  estado?: EstadoCierre | null;
  pagina?: number;
  cantidad?: number;
}

/** `ResultadoAperturaDto` de `POST /cierres`. */
export interface ResultadoAperturaDto {
  /** CREADO | ACTUALIZADO | SIN_CAMBIOS. */
  resultado: string;
  mensaje: string;
  cierre: CierreDto | null;
}
