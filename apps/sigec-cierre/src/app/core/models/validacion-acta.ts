import type { ErrorCampo } from '../../shared/validacion-formulario';
import { Anexo21Datos, ItemVerificadoDto, PATRON_DOCUMENTO, dnisRepetidos, errorHorario } from './anexo21.model';

const lleno = (texto: string | null | undefined) => !!texto && texto.trim().length > 0;

/**
 * Lo que la API rechaza al guardar (`Anexo21DatosValidator`): filas con celdas obligatorias vacías, documentos con
 * formato inválido o repetidos y un horario incoherente. Hay que corregirlo antes de guardar el borrador.
 */
export function erroresBloqueantesActa(a: Anexo21Datos): ErrorCampo[] {
  const errores: ErrorCampo[] = [];
  const dniProfesional = a.codDniProfesional?.trim() ?? '';
  if (dniProfesional && !PATRON_DOCUMENTO.test(dniProfesional)) {
    errores.push({ id: 'acta-dni-profesional', mensaje: 'DNI de 8 dígitos o carné de extranjería (8 a 12 caracteres).' });
  }
  const horario = errorHorario(a.fecInicioReunion, a.fecFinReunion);
  if (horario) {
    errores.push({ id: 'acta-hora-firma', mensaje: horario });
  }
  for (const [lista, filas] of [['bienes', a.bienes], ['servicios', a.servicios]] as const) {
    filas.forEach((item: ItemVerificadoDto, i) => {
      if (item.ideItemSel !== null) return;
      if (!lleno(item.txtDescripcion)) errores.push({ id: `${lista}-descripcion-${i}`, mensaje: 'Indique la descripción.' });
      if (!lleno(item.txtUnidadMedida)) errores.push({ id: `${lista}-unidad-${i}`, mensaje: 'Indique la unidad de medida.' });
    });
    filas.forEach((item, i) => {
      if (item.canCantidad === null || Number(item.canCantidad) < 0 || Number.isNaN(Number(item.canCantidad))) {
        errores.push({ id: `${lista}-cantidad-${i}`, mensaje: 'Cantidad de 0 o más.' });
      }
    });
  }
  a.logros.forEach((l, i) => {
    if (!lleno(l.txtObjetivoEspecifico)) errores.push({ id: `logro-objetivo-${i}`, mensaje: 'Elija el objetivo específico.' });
    if (!lleno(l.txtLogroAlcanzado)) errores.push({ id: `logro-texto-${i}`, mensaje: 'Describa el logro alcanzado.' });
  });
  const repetidos = new Set(dnisRepetidos(a.asistentes));
  a.asistentes.forEach((p, i) => {
    if (!lleno(p.txtNombres)) errores.push({ id: `asistente-nombres-${i}`, mensaje: 'Indique nombres y apellidos.' });
    if (!lleno(p.txtCargo)) errores.push({ id: `asistente-cargo-${i}`, mensaje: 'Indique el cargo.' });
    const dni = (p.codDni ?? '').trim();
    if (!dni) errores.push({ id: `asistente-dni-${i}`, mensaje: 'Indique el DNI.' });
    else if (!PATRON_DOCUMENTO.test(dni)) errores.push({ id: `asistente-dni-${i}`, mensaje: 'DNI de 8 dígitos o carné (8 a 12).' });
    else if (repetidos.has(dni.toUpperCase())) errores.push({ id: `asistente-dni-${i}`, mensaje: 'DNI repetido.' });
  });
  return errores;
}

/**
 * Lo que falta para registrar la verificación, con las mismas reglas que `CompletitudAnexo21` de la API (que sigue
 * siendo la que decide: su lista `faltantes` llega con el acta). No impide guardar el borrador.
 */
export function faltantesActa(a: Anexo21Datos): ErrorCampo[] {
  const faltan: ErrorCampo[] = [];
  const exigir = (presente: boolean, id: string | null, mensaje: string) => {
    if (!presente) faltan.push({ id, mensaje });
  };
  exigir(lleno(a.txtLocalidad), 'acta-localidad', 'Indique la localidad.');
  exigir(lleno(a.txtDistrito), 'acta-distrito', 'Indique el distrito.');
  exigir(lleno(a.txtProvincia), 'acta-provincia', 'Indique la provincia.');
  exigir(lleno(a.txtRegion), 'acta-region', 'Indique la región.');
  exigir(!!a.fecInicioReunion, 'acta-inicio', 'Indique la fecha y hora de inicio.');
  exigir(!!a.fecFinReunion, 'acta-hora-firma', 'Indique la hora de firma.');
  exigir(lleno(a.txtLocal), 'acta-local', 'Indique el local de la reunión.');
  exigir(lleno(a.txtDireccionLocal), 'acta-direccion', 'Indique la dirección del local.');
  exigir(lleno(a.txtOrganizacion), null, 'El SEL no registra la organización agraria.');
  exigir(lleno(a.txtProfesionalAgroideas), 'acta-profesional', 'Indique el profesional de AGROIDEAS.');
  exigir(lleno(a.codDniProfesional), 'acta-dni-profesional', 'Indique el DNI del profesional.');
  exigir(lleno(a.txtPlanNegocio), null, 'El SEL no registra el nombre del PNT.');
  exigir(a.bienes.length + a.servicios.length > 0, 'acta-primero', 'Agregue al menos un bien o servicio verificado.');
  exigir(lleno(a.txtPresidente), 'acta-presidente', 'Indique al presidente de la organización.');
  exigir(a.logros.length > 0, 'acta-logros', 'Agregue al menos un logro.');
  exigir(lleno(a.txtNumeroConvenio), null, 'El SEL no registra el número de convenio.');
  exigir(a.asistentes.length > 0, 'acta-asistentes', 'Agregue a quienes firman el acta.');
  return faltan;
}
