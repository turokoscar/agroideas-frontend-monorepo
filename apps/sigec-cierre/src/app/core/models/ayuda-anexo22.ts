import { Anexo22Datos } from './anexo22.model';

/**
 * Qué se espera de cada texto del Anexo 22, para la ayuda bajo su etiqueta (ADR 0015, D7). Redacción inicial, a
 * validar con la UN o el Instructivo (punto abierto 3 del ADR).
 */
export const AYUDA_TEXTO_ANEXO22: Readonly<Partial<Record<keyof Anexo22Datos, string>>> = {
  txtAnalisisProduccion:
    'Compare lo ejecutado con lo programado y con la línea base, y explique las causas de las desviaciones (clima, plagas, mercado…).',
  txtAnalisisPrecios: 'Precios de venta obtenidos frente a los previstos en el PNT y su efecto en los ingresos.',
  txtAnalisisComercializacion: 'Volúmenes vendidos, destinos y compradores, y si se cumplieron los acuerdos comerciales.',
  txtAnalisisIngresos: 'Ingresos de la organización frente a lo programado y a la línea base.',
  txtAnalisisObjetivos: 'Cumplimiento de las metas de cada objetivo específico y, si no se alcanzaron, por qué.',
  txtAnalisisFinanciamiento: 'Ejecución de AGROIDEAS y de la contrapartida frente a lo aprobado; los saldos y sus causas.',
  txtAnalisisItems: 'Bienes y servicios entregados frente a lo programado; los no ejecutados o ejecutados en parte, y por qué.',
  txtLogros: 'Resultados concretos que la organización alcanzó con el PNT. Se precarga con los logros del Acta de Cierre.',
  txtLeccionesAprendidas: 'Qué funcionó y qué no, de forma que sirva a otros planes de negocio.',
  txtDificultades: 'Problemas que afectaron la ejecución. Se precarga con las dificultades del Acta de Cierre.',
  txtConclusiones: 'Valoración final de la ejecución del PNT, coherente con el resultado de la evaluación.',
  txtRecomendaciones: 'Para la organización y para AGROIDEAS.'
};
