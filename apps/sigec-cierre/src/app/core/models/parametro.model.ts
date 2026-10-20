import { environment } from '../../../environments/environment';

/** Parámetros del módulo (ADR 0013 Fase 5). Espejo de `SIGEC_CIERRE.Entidad/Parametros/ParametroDtos.cs`. */
export interface ParametroDto {
  codParametro: string;
  txtValor: string;
  txtDescripcion: string;
  ideUsuario: number | null;
  fecModificacion: string;
}

/** Parámetros en días (`CodigosParametro.Enteros`). */
export const PARAMETROS_DIAS: readonly string[] = ['PLAZO_ANEXO20_DIAS', 'PLAZO_EVALUACION_UN_DIAS', 'PLAZO_REVISION_UAJ_DIAS', 'ALERTA_DIAS_PREVIOS'];

export type GrupoParametro = 'plazos' | 'sede' | 'correos' | 'otros';

export function grupoParametro(codigo: string): GrupoParametro {
  if (PARAMETROS_DIAS.includes(codigo)) return 'plazos';
  if (codigo.startsWith('SEDE_')) return 'sede';
  if (codigo.startsWith('CORREO_')) return 'correos';
  return 'otros';
}

const CORREO = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/** Valida el valor como `ParametroServicio.ValidarValor`; null si es válido. */
export function errorParametro(codigo: string, valor: string): string | null {
  const v = valor.trim();
  const { diasPlazoMinimo: min, diasPlazoMaximo: max, longitudValorParametro } = environment.administracion;
  if (v.length > longitudValorParametro) return `El valor admite hasta ${longitudValorParametro} caracteres.`;
  if (PARAMETROS_DIAS.includes(codigo)) {
    const dias = Number(v);
    return /^\d+$/.test(v) && dias >= min && dias <= max ? null : `Debe ser un número de días entre ${min} y ${max}.`;
  }
  if (codigo === 'SEDE_COD_DEPARTAMENTO') return /^\d{2}$/.test(v) ? null : 'Debe ser un ubigeo de departamento de 2 dígitos.';
  if (codigo === 'SEDE_COD_PROVINCIA') return /^\d{4}$/.test(v) ? null : 'Debe ser un ubigeo de provincia de 4 dígitos.';
  if (codigo.startsWith('CORREO_')) {
    const correos = v.split(/[,;]/).map(c => c.trim()).filter(Boolean);
    return correos.every(c => CORREO.test(c)) ? null : 'Escriba correos válidos separados por coma o punto y coma (vacío: no enviar).';
  }
  return null;
}
