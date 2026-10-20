/**
 * Acta de Cierre del PNT (Anexo 21). Espejo de `SIGEC_CIERRE.Entidad/Anexo21/Anexo21Dtos.cs`.
 * Organización, PNT y convenio vienen del SEL (solo lectura); en los ítems programados solo se
 * editan la cantidad verificada y las observaciones: el resto lo fija el servidor (sel-api-general y KOFIX).
 */

/** Bien o servicio corroborado en campo. */
export interface ItemVerificadoDto {
  numOrden: number;
  txtDescripcion: string;
  txtUnidadMedida: string;
  /** Cantidad corroborada en campo (propuesta: la ejecutada según KOFIX). */
  canCantidad: number;
  txtObservaciones: string | null;
  /** Ítem programado del SEL; null en las filas agregadas a mano. */
  ideItemSel: number | null;
  /** Referencias de la precarga (no salen en el acta impresa). */
  canProgramada: number | null;
  canEjecutada: number | null;
  impEjecutado: number | null;
}

export interface LogroDto {
  numOrden: number;
  txtObjetivoEspecifico: string;
  txtLogroAlcanzado: string;
}

export interface AsistenteDto {
  numOrden: number;
  txtNombres: string;
  txtCargo: string;
  codDni: string;
}

export interface Anexo21Datos {
  txtLocalidad: string | null;
  txtDistrito: string | null;
  txtProvincia: string | null;
  txtRegion: string | null;
  /** Inicio de la reunión de cierre (fecha y hora, hora de Perú). */
  fecInicioReunion: string | null;
  /** Firma del acta: el mismo día que el inicio. */
  fecFinReunion: string | null;
  txtLocal: string | null;
  txtDireccionLocal: string | null;
  txtOrganizacion: string | null;
  txtProfesionalAgroideas: string | null;
  codDniProfesional: string | null;
  txtPlanNegocio: string | null;
  bienes: ItemVerificadoDto[];
  servicios: ItemVerificadoDto[];
  txtPresidente: string | null;
  logros: LogroDto[];
  txtDificultades: string | null;
  txtNumeroConvenio: string | null;
  asistentes: AsistenteDto[];
}

export interface Anexo21Dto extends Anexo21Datos {
  /** 0 si aún no se guardó (propuesta precargada). */
  ideAnexo21: number;
  ideCierreConvenio: number;
  /** BORRADOR | REGISTRADO. */
  estAnexo21: string;
  ideUsuario: number;
  fecRegistro: string;
  fecModificacion: string;
  /** Lo que falta para registrar la verificación (vacío = completo). */
  faltantes: string[];
}

/** DNI (8 dígitos) o carné de extranjería (hasta 12 alfanuméricos), como `Anexo21DatosValidator`. */
export const PATRON_DOCUMENTO = /^[0-9A-Za-z]{8,12}$/;

/** DNIs repetidos entre los asistentes (la API los rechaza). */
export function dnisRepetidos(asistentes: readonly AsistenteDto[]): string[] {
  const vistos = new Set<string>();
  const repetidos = new Set<string>();
  for (const a of asistentes) {
    const dni = (a.codDni ?? '').trim().toUpperCase();
    if (!dni) continue;
    if (vistos.has(dni)) repetidos.add(dni);
    vistos.add(dni);
  }
  return [...repetidos];
}

/** La reunión empieza y el acta se firma el mismo día, y la firma no es anterior al inicio. */
export function errorHorario(inicio: string | null, fin: string | null): string | null {
  if (!inicio || !fin) return null;
  if (inicio.slice(0, 10) !== fin.slice(0, 10)) return 'El acta se firma el mismo día de la reunión.';
  if (fin < inicio) return 'La hora de término no puede ser anterior a la de inicio.';
  return null;
}
