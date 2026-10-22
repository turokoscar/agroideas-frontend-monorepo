import type { ErrorCampo } from '../../shared/validacion-formulario';
import { Anexo22Datos, RESULTADOS } from './anexo22.model';

const lleno = (texto: string | null | undefined) => !!texto && texto.trim().length > 0;

/**
 * Lo que falta para presentar el Anexo 22, con las mismas reglas que `CompletitudAnexo22` de la API (que sigue siendo la
 * que decide). Las tablas de indicadores no se exigen; lo que viene del SEL tampoco. Los análisis de las secciones II y
 * III usan el id `a22-<campo>` de la plantilla `bloque`.
 */
export function faltantesAnexo22(a: Anexo22Datos): ErrorCampo[] {
  const faltan: ErrorCampo[] = [];
  const exigir = (presente: boolean, id: string | null, mensaje: string) => {
    if (!presente) faltan.push({ id, mensaje });
  };
  exigir(lleno(a.txtAnalisisProduccion), 'a22-txtAnalisisProduccion', 'Escriba el análisis de producción y productividad (2.1).');
  exigir(lleno(a.txtAnalisisPrecios), 'a22-txtAnalisisPrecios', 'Escriba el análisis de precios (2.2).');
  exigir(lleno(a.txtAnalisisComercializacion), 'a22-txtAnalisisComercializacion', 'Escriba el análisis de comercialización (2.3).');
  exigir(lleno(a.txtAnalisisIngresos), 'a22-txtAnalisisIngresos', 'Escriba el análisis de ingresos (2.4).');
  exigir(lleno(a.txtAnalisisObjetivos), 'a22-txtAnalisisObjetivos', 'Escriba el análisis del cumplimiento de metas (III).');
  exigir(
    a.financiamiento.some(f => f.tipFuente.toUpperCase() === 'AGROIDEAS'),
    null,
    'Falta la ejecución financiera de AGROIDEAS (4.1): la carga el sistema desde KOFIX.'
  );
  exigir(lleno(a.txtAnalisisFinanciamiento), 'a22-analisis-fin', 'Escriba el análisis de la ejecución por fuente (4.1).');
  exigir(lleno(a.txtAnalisisItems), 'a22-analisis-items', 'Escriba el análisis de la ejecución por bien y servicio (4.2).');
  exigir(lleno(a.txtLogros), 'a22-logros', 'Escriba los logros (VII).');
  exigir(lleno(a.txtLeccionesAprendidas), 'a22-lecciones', 'Escriba las lecciones aprendidas (VIII).');
  exigir(lleno(a.txtConclusiones), 'a22-conclusiones', 'Escriba las conclusiones (X).');
  exigir(lleno(a.txtRecomendaciones), 'a22-recomendaciones', 'Escriba las recomendaciones (XI).');
  exigir(RESULTADOS.some(r => r.valor === a.tipResultado), 'a22-resultado', 'Elija el resultado de la evaluación.');
  return faltan;
}
