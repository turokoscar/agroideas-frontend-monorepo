/**
 * Contratos de sigec-api-cierre que usa sigec-rtf (ADR 0013 del monorepo, Fase A): el Anexo 20 que la
 * OA llena con el último RTF y el expediente de cierre de su convenio. Espejo de
 * `SIGEC_CIERRE.Entidad/Anexo20/Anexo20Dtos.cs` y `Cierre/CierreDto.cs` (JSON en camelCase).
 */

export interface ProblematicaDto {
  numOrden: number;
  txtProblema: string | null;
  txtCausa: string | null;
  txtPropuestaSolucion: string | null;
}

/** IV. Meta por objetivo específico e indicador, lograda al tercer año. */
export interface MetaAnexo20Dto {
  numOrden: number;
  txtObjetivoEspecifico: string;
  txtIndicador: string;
  /** Valor logrado con su unidad (p. ej. "18 qq/ha/año"). */
  txtLogradoAnio3: string;
  txtComentarios: string | null;
}

/** V. Producto comercializado al finalizar el PNT. */
export interface ComercializacionAnexo20Dto {
  numOrden: number;
  txtProducto: string;
  txtDestino: string;
  txtUnidadMedida: string;
  canComercializada: number;
  impPrecioVenta: number;
  impTotalIngreso: number;
}

/**
 * Cuerpo de `PUT /convenios/{id}/anexos20`. Lo que ya está en el SEL (secciones I a III, salvo
 * financiamiento de la OA, centro poblado y adenda) lo fija el servidor y descarta lo que envíe el cliente.
 */
export interface Anexo20Datos {
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
  impFinanciamientoAgroideas: number | null;
  impFinanciamientoOa: number | null;
  txtCadenaProductiva: string | null;
  canSociasMujeres: number | null;
  canSociosHombres: number | null;
  numHectareas: number | null;
  problematica: ProblematicaDto[];
  txtObjetivoGeneral: string | null;
  txtObjetivosEspecificos: string | null;
  metas: MetaAnexo20Dto[];
  comercializacion: ComercializacionAnexo20Dto[];
  txtComentariosComercial: string | null;
  txtPracticaAmbiental: string | null;
}

export interface Anexo20Dto extends Anexo20Datos {
  /** 0 si aún no se guardó (propuesta precargada desde el SEL). */
  ideAnexo20: number;
  ideConvenio: number;
  ideCierreConvenio: number | null;
  /** BORRADOR | PRESENTADO. */
  estAnexo20: string;
  canSociosTotal: number | null;
  numAnexo20: string | null;
  fecRegistro: string;
  fecModificacion: string;
  /** Secciones obligatorias que faltan para generar y presentar el documento (vacío = completo). */
  faltantes: string[];
}

/** Lo que sigec-rtf necesita de un expediente de cierre (`CierreDto`). */
export interface ExpedienteCierreDto {
  ideCierreConvenio: number;
  ideConvenio: number;
  estCierre: string;
  fecInicio: string;
  flgDeOficio: boolean;
  fecRecepcionAnexo20: string | null;
}

export interface PlazoCierreDto {
  idePlazo: number;
  /** ANEXO20 | EVALUACION_UN | REVISION_UAJ. */
  tipPlazo: string;
  canDias: number;
  fecLimite: string;
  /** VIGENTE | CUMPLIDO | VENCIDO | CANCELADO. */
  estPlazo: string;
}

/** Etiquetas de `EstadoCierre` para el hito de cierre del dashboard. */
export const ETIQUETA_ESTADO_CIERRE: Readonly<Record<string, string>> = {
  ESPERA_ANEXO20: 'Espera del Anexo 20',
  EN_VERIFICACION: 'En verificación de campo',
  EN_EVALUACION_UN: 'En evaluación de la UN',
  DERIVADO_DE: 'En la Dirección Ejecutiva',
  EN_REVISION_UAJ: 'En revisión legal',
  OBSERVADO_UAJ: 'Observado por la UAJ',
  PROYECTO_RDE_REMITIDO: 'Proyecto de RDE remitido',
  CERRADO: 'Cerrado'
};

/** `tipConcepto` con el que RTF guarda el PDF firmado del Anexo 20 (regla V3 de sigec-api-rtf). */
export const TIPO_INFORME_CIERRE = 'INFORME_CIERRE_PNT';
