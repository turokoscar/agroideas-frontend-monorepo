/** Calendario de días inhábiles (ADR 0013 Fase 5). Espejo de `SIGEC_CIERRE.Entidad/Calendario/CalendarioDtos.cs`. */

export type TipoDiaInhabil = 'FERIADO_NACIONAL' | 'NO_LABORABLE_PUBLICO' | 'REGIONAL';

export const TIPOS_DIA: readonly { valor: TipoDiaInhabil; etiqueta: string }[] = [
  { valor: 'FERIADO_NACIONAL', etiqueta: 'Feriado nacional' },
  { valor: 'NO_LABORABLE_PUBLICO', etiqueta: 'No laborable (sector público)' },
  { valor: 'REGIONAL', etiqueta: 'Regional' }
];

export function etiquetaTipoDia(tipo: string): string {
  return TIPOS_DIA.find(t => t.valor === tipo)?.etiqueta ?? tipo;
}

/** Departamentos del Perú con su ubigeo (`DepartamentosPeru` de la API). */
export const DEPARTAMENTOS: readonly { codigo: string; nombre: string }[] = [
  ['01', 'Amazonas'], ['02', 'Áncash'], ['03', 'Apurímac'], ['04', 'Arequipa'], ['05', 'Ayacucho'], ['06', 'Cajamarca'],
  ['07', 'Callao'], ['08', 'Cusco'], ['09', 'Huancavelica'], ['10', 'Huánuco'], ['11', 'Ica'], ['12', 'Junín'],
  ['13', 'La Libertad'], ['14', 'Lambayeque'], ['15', 'Lima'], ['16', 'Loreto'], ['17', 'Madre de Dios'], ['18', 'Moquegua'],
  ['19', 'Pasco'], ['20', 'Piura'], ['21', 'Puno'], ['22', 'San Martín'], ['23', 'Tacna'], ['24', 'Tumbes'], ['25', 'Ucayali']
].map(([codigo, nombre]) => ({ codigo, nombre }));

export function nombreDepartamento(codigo: string | null | undefined): string | null {
  return codigo ? DEPARTAMENTOS.find(d => d.codigo === codigo)?.nombre ?? codigo : null;
}

export interface FeriadoDto {
  ideFeriado: number;
  fecDia: string;
  tipDia: TipoDiaInhabil | string;
  codDepartamento: string | null;
  codProvincia: string | null;
  txtDescripcion: string;
  txtSustento: string | null;
  /** GOB_PE | MANUAL. */
  tipOrigen: string;
  flgActivo: boolean;
}

export interface CrearFeriadoRequest {
  fecDia: string;
  tipDia: TipoDiaInhabil | string;
  codDepartamento: string | null;
  codProvincia: string | null;
  txtDescripcion: string;
  txtSustento: string | null;
  tipOrigen: 'GOB_PE' | 'MANUAL';
}

export interface ActualizarFeriadoRequest {
  codDepartamento: string | null;
  codProvincia: string | null;
  txtDescripcion: string;
  txtSustento: string | null;
}

/** Día propuesto por la importación desde gob.pe (no se guarda hasta registrarlo). */
export interface FeriadoPropuestoDto {
  fecDia: string;
  tipDia: TipoDiaInhabil | string;
  codDepartamento: string | null;
  nombreDepartamento: string | null;
  txtDescripcion: string;
  txtSustento: string | null;
  yaRegistrado: boolean;
  /** gob.pe no deja claro el alcance territorial: revisar antes de registrar. */
  revisarAlcance: boolean;
}

/**
 * Alcance territorial válido, como `FeriadoServicio`: el regional exige departamento (y, si hay provincia, un ubigeo de 4
 * dígitos del mismo departamento); los nacionales y no laborables no llevan ni departamento ni provincia.
 */
export function errorAlcance(tipo: string, departamento: string | null, provincia: string | null): string | null {
  const dep = departamento?.trim() || null;
  const prov = provincia?.trim() || null;
  if (tipo === 'REGIONAL') {
    if (!dep || !DEPARTAMENTOS.some(d => d.codigo === dep)) return 'Un día regional requiere el departamento.';
    if (prov && !(/^\d{4}$/.test(prov) && prov.startsWith(dep))) return 'La provincia debe ser un ubigeo de 4 dígitos del departamento elegido.';
    return null;
  }
  return dep || prov ? 'Los feriados nacionales y los no laborables no llevan departamento ni provincia.' : null;
}

/** Años que toca un periodo de `dias` días desde `desde` (incluido): los que el calendario debe tener cubiertos. */
export function aniosACubrir(dias: number, desde: Date = new Date()): number[] {
  const hasta = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() + dias);
  const anios: number[] = [];
  for (let anio = desde.getFullYear(); anio <= hasta.getFullYear(); anio++) anios.push(anio);
  return anios;
}
