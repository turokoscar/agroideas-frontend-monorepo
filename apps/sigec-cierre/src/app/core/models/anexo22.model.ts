import { environment } from '../../../environments/environment';

/**
 * Informe de Evaluación de la Ejecución del PNT para Cierre (Anexo 22). Espejo de
 * `SIGEC_CIERRE.Entidad/Anexo22/Anexo22Dtos.cs`. Lo que ya está en el SEL, RTF y KOFIX lo fija el
 * servidor (`ComposicionAnexo22`); la UN escribe los análisis, las filas manuales, la contrapartida de la
 * OA, la sección VI (actividad y comentarios), VII a XI y el resultado.
 */

export type OrigenDato = 'SEL_GENERAL+RTF' | 'SEL_GENERAL+KOFIX' | 'MANUAL';

export const ETIQUETA_ORIGEN_DATO: Readonly<Record<string, string>> = {
  'SEL_GENERAL+RTF': 'SEL + RTF',
  'SEL_GENERAL+KOFIX': 'SEL + KOFIX',
  MANUAL: 'Manual'
};

export type ResultadoEvaluacion = 'CONFORME' | 'CON_OBSERVACIONES' | 'NO_EJECUTADO';

export const RESULTADOS: readonly { valor: ResultadoEvaluacion; etiqueta: string }[] = [
  { valor: 'CONFORME', etiqueta: 'Convenio Ejecutado Conforme' },
  { valor: 'CON_OBSERVACIONES', etiqueta: 'Convenio Ejecutado con Observaciones' },
  { valor: 'NO_EJECUTADO', etiqueta: 'Convenio No Ejecutado' }
];

export interface ProblematicaDto {
  numOrden: number;
  txtProblema: string | null;
  txtCausa: string | null;
  txtPropuestaSolucion: string | null;
}

export interface IndicadorEvaluacionDto {
  numOrden: number;
  txtConcepto: string;
  txtUnidadMedida: string | null;
  txtDestino: string | null;
  txtObjetivoEspecifico: string | null;
  txtActividad: string | null;
  numLineaBase: number | null;
  numProgAnio1: number | null;
  numEjecAnio1: number | null;
  numProgAnio2: number | null;
  numEjecAnio2: number | null;
  numProgAnio3: number | null;
  numEjecAnio3: number | null;
  numResultado: number | null;
  txtMedioVerificacion: string | null;
  txtComentarios: string | null;
  ideIndicadorSel: number | null;
  txtOrigen: OrigenDato | string;
}

export interface FinanciamientoEvaluacionDto {
  /** AGROIDEAS (del sistema) | ORGANIZACION (contrapartida, la escribe la UN). */
  tipFuente: string;
  impAprobado: number;
  impEjecutado: number;
  txtOrigen: string;
}

export interface ItemEvaluacionDto {
  numOrden: number;
  txtDescripcion: string;
  txtUnidadMedida: string | null;
  canProgramada: number;
  impProgramado: number;
  canEjecutada: number;
  impEjecutado: number;
  ideItemSel: number | null;
  txtOrigen: string;
}

export interface MonitoreoEvaluacionDto {
  numAnio: number;
  numPasoCritico: number;
  fecInicio: string | null;
  fecFin: string | null;
  fecPresentacion: string | null;
  ideRtf: number | null;
  txtOrigen: string;
}

export interface Anexo22Datos {
  txtOrganizacion: string | null;
  txtPlanNegocio: string | null;
  txtRegion: string | null;
  txtProvincia: string | null;
  txtDistrito: string | null;
  txtCentroPoblado: string | null;
  txtNumeroConvenio: string | null;
  fecInicioConvenio: string | null;
  fecFinConvenio: string | null;
  fecTerminoAdenda: string | null;
  txtCadenaProductiva: string | null;
  canSociasMujeres: number | null;
  canSociosHombres: number | null;
  numHectareas: number | null;
  codRuc: string | null;
  problematica: ProblematicaDto[];
  txtObjetivoGeneral: string | null;
  txtObjetivosEspecificos: string | null;
  produccion: IndicadorEvaluacionDto[];
  txtAnalisisProduccion: string | null;
  precios: IndicadorEvaluacionDto[];
  txtAnalisisPrecios: string | null;
  comercializacion: IndicadorEvaluacionDto[];
  txtAnalisisComercializacion: string | null;
  ingresos: IndicadorEvaluacionDto[];
  txtAnalisisIngresos: string | null;
  objetivosEspecificos: IndicadorEvaluacionDto[];
  txtAnalisisObjetivos: string | null;
  financiamiento: FinanciamientoEvaluacionDto[];
  txtAnalisisFinanciamiento: string | null;
  bienes: ItemEvaluacionDto[];
  servicios: ItemEvaluacionDto[];
  txtAnalisisItems: string | null;
  monitoreo: MonitoreoEvaluacionDto[];
  practicaAmbiental: IndicadorEvaluacionDto[];
  txtLogros: string | null;
  txtLeccionesAprendidas: string | null;
  txtDificultades: string | null;
  txtConclusiones: string | null;
  txtRecomendaciones: string | null;
  tipResultado: ResultadoEvaluacion | null;
}

export interface Anexo22Dto extends Anexo22Datos {
  ideAnexo22: number;
  ideCierreConvenio: number;
  /** BORRADOR | FIRMADO. */
  estAnexo22: string;
  /** Cada observación de la UAJ lo reabre como versión nueva. */
  numVersion: number;
  ideUsuario: number;
  fecRegistro: string;
  fecModificacion: string;
  faltantes: string[];
}

/** Versión firmada del Anexo 22 (`GET …/anexos22/versiones`). */
export interface VersionAnexo22Dto {
  numVersion: number;
  codArchivo: string;
  ideUsuario: number;
  fecRegistro: string;
}

/** Secciones de indicadores en las que la UN puede agregar filas a mano (fuente aún no definida, ADR-003). */
export type SeccionManual = 'precios' | 'comercializacion' | 'ingresos' | 'objetivosEspecificos';

/**
 * Variación porcentual de `valor` frente a `referencia`, como `VariacionIndicador.Porcentual` de la API:
 * null si no hay referencia positiva o no hay valor.
 */
export function variacion(referencia: number | null | undefined, valor: number | null | undefined): number | null {
  if (referencia == null || referencia <= 0 || valor == null) return null;
  return Math.round(((valor - referencia) / referencia) * 10000) / 100;
}

/** La variación cae por debajo del umbral crítico (por defecto −20 %, configurable en `AppSettings`). */
export function esCritica(pct: number | null, umbral = environment.evaluacion.umbralDesviacionCriticaPct): boolean {
  return pct !== null && pct < umbral;
}

/** Ejecutado al cierre: el resultado si lo hay; si no, el último año ejecutado (como `NumEjecutadoCierre`). */
export function ejecutadoCierre(i: IndicadorEvaluacionDto): number | null {
  return i.numResultado ?? i.numEjecAnio3 ?? i.numEjecAnio2 ?? i.numEjecAnio1 ?? null;
}

/** Hay alguna desviación crítica entre lo programado y lo ejecutado de algún año. */
export function tieneDesviacionCritica(i: IndicadorEvaluacionDto): boolean {
  return [
    variacion(i.numProgAnio1, i.numEjecAnio1),
    variacion(i.numProgAnio2, i.numEjecAnio2),
    variacion(i.numProgAnio3, i.numEjecAnio3)
  ].some(v => esCritica(v));
}

/** Fila vacía para las secciones manuales. */
export function nuevoIndicador(numOrden: number): IndicadorEvaluacionDto {
  return {
    numOrden,
    txtConcepto: '',
    txtUnidadMedida: null,
    txtDestino: null,
    txtObjetivoEspecifico: null,
    txtActividad: null,
    numLineaBase: null,
    numProgAnio1: null,
    numEjecAnio1: null,
    numProgAnio2: null,
    numEjecAnio2: null,
    numProgAnio3: null,
    numEjecAnio3: null,
    numResultado: null,
    txtMedioVerificacion: null,
    txtComentarios: null,
    ideIndicadorSel: null,
    txtOrigen: 'MANUAL'
  };
}
