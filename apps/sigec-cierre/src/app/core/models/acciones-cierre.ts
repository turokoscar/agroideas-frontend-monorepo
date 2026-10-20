import { EstadoCierre } from './cierre.model';
import { CierreRol } from './rol-cierre.model';

/**
 * Espejo de la tabla de `MaquinaEstadosCierre` (sigec-api-cierre, ADR-001 D1): qué acción se puede
 * ejecutar en qué estado y con qué rol. Solo decide qué formulario o botón mostrar; la API vuelve a
 * validar cada acción y responde 403/409 si no corresponde (ADR 0013, D2). Si la API cambia la tabla,
 * hay que actualizar esta copia.
 */
export type AccionCierre =
  | 'IniciarCierre'
  | 'PresentarAnexo20'
  | 'RegistrarVerificacionCampo'
  | 'DerivarDe'
  | 'TrasladarUaj'
  | 'ObservarUaj'
  | 'SubsanarYElevarDe'
  | 'RemitirProyectoRde'
  | 'SuscribirRde'
  | 'RegistrarCargoNotificacion';

interface Transicion {
  origenes: readonly EstadoCierre[];
  roles: readonly CierreRol[];
}

const UN: readonly CierreRol[] = ['UN', 'JEFE_UN'];

const TRANSICIONES: Readonly<Record<AccionCierre, Transicion>> = {
  IniciarCierre: { origenes: [], roles: UN },
  PresentarAnexo20: { origenes: ['ESPERA_ANEXO20'], roles: ['OA', ...UN] },
  RegistrarVerificacionCampo: { origenes: ['EN_VERIFICACION'], roles: ['UR', ...UN] },
  DerivarDe: { origenes: ['EN_EVALUACION_UN'], roles: UN },
  TrasladarUaj: { origenes: ['DERIVADO_DE'], roles: ['DE'] },
  ObservarUaj: { origenes: ['EN_REVISION_UAJ'], roles: ['UAJ'] },
  SubsanarYElevarDe: { origenes: ['OBSERVADO_UAJ'], roles: UN },
  RemitirProyectoRde: { origenes: ['EN_REVISION_UAJ'], roles: ['UAJ'] },
  SuscribirRde: { origenes: ['PROYECTO_RDE_REMITIDO'], roles: ['DE'] },
  RegistrarCargoNotificacion: { origenes: ['CERRADO'], roles: ['DE'] }
};

/** El usuario puede ejecutar la acción con el expediente en ese estado. */
export function puedeEjecutar(accion: AccionCierre, estado: EstadoCierre, roles: readonly CierreRol[]): boolean {
  const t = TRANSICIONES[accion];
  return t.origenes.includes(estado) && roles.some(r => t.roles.includes(r));
}

/** Acciones disponibles para el usuario en el estado actual. */
export function accionesDisponibles(estado: EstadoCierre, roles: readonly CierreRol[]): AccionCierre[] {
  return (Object.keys(TRANSICIONES) as AccionCierre[]).filter(a => puedeEjecutar(a, estado, roles));
}
