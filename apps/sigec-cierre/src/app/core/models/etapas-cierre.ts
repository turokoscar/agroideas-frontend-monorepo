import { CierreDetalleDto, DocumentoCierreDto, EstadoCierre, TipoDocumentoCierre } from './cierre.model';
import { PlazoDto, TipoPlazo } from './plazo.model';

/**
 * Etapas del stepper del expediente (ADR 0013, D3). Son seis, en el orden del flujo de
 * `MaquinaEstadosCierre`; el ciclo de observaciones de la UAJ (`OBSERVADO_UAJ → DERIVADO_DE`) no
 * agrega etapas: se muestra como una nota sobre la etapa de revisión legal.
 */
export type ClaveEtapa = 'ANEXO20' | 'VERIFICACION' | 'EVALUACION_UN' | 'DIRECCION_EJECUTIVA' | 'REVISION_UAJ' | 'RDE';

export type SituacionEtapa = 'completada' | 'activa' | 'pendiente';

export interface EtapaCierre {
  clave: ClaveEtapa;
  numero: number;
  titulo: string;
  /** Quién actúa en la etapa. */
  actor: string;
  situacion: SituacionEtapa;
  /** Fecha en que la etapa se completó, si se conoce. */
  fecha: string | null;
  documentos: DocumentoCierreDto[];
  /** Plazo de la etapa: el vigente o, si ya no hay, el último registrado. */
  plazo: PlazoDto | null;
  /** Aclaraciones: de oficio, observado, contingencia, RDE… */
  notas: string[];
}

interface DefinicionEtapa {
  clave: ClaveEtapa;
  titulo: string;
  actor: string;
  documentos: readonly TipoDocumentoCierre[];
  tipoPlazo: TipoPlazo | null;
}

const ETAPAS: readonly DefinicionEtapa[] = [
  { clave: 'ANEXO20', titulo: 'Informe de Cierre (Anexo 20)', actor: 'Organización Agraria', documentos: ['ANEXO_20'], tipoPlazo: 'ANEXO20' },
  { clave: 'VERIFICACION', titulo: 'Verificación de campo y Acta (Anexo 21)', actor: 'Unidad Regional o UN', documentos: ['ANEXO_21'], tipoPlazo: null },
  { clave: 'EVALUACION_UN', titulo: 'Informe de Evaluación (Anexo 22)', actor: 'Unidad de Negocios', documentos: ['ANEXO_22'], tipoPlazo: 'EVALUACION_UN' },
  { clave: 'DIRECCION_EJECUTIVA', titulo: 'Dirección Ejecutiva', actor: 'Dirección Ejecutiva', documentos: [], tipoPlazo: null },
  { clave: 'REVISION_UAJ', titulo: 'Revisión legal', actor: 'Asesoría Jurídica', documentos: ['INFORME_LEGAL', 'PROYECTO_RDE'], tipoPlazo: 'REVISION_UAJ' },
  { clave: 'RDE', titulo: 'Resolución de cierre (RDE)', actor: 'Dirección Ejecutiva', documentos: ['RDE', 'CARGO_NOTIFICACION_RDE'], tipoPlazo: null }
];

/** Índice de la etapa activa por estado; `CERRADO` (6) deja todas completadas. */
const ETAPA_ACTIVA: Readonly<Record<EstadoCierre, number>> = {
  ESPERA_ANEXO20: 0,
  EN_VERIFICACION: 1,
  EN_EVALUACION_UN: 2,
  DERIVADO_DE: 3,
  EN_REVISION_UAJ: 4,
  OBSERVADO_UAJ: 4,
  PROYECTO_RDE_REMITIDO: 5,
  CERRADO: 6
};

export function indiceEtapaActiva(estado: EstadoCierre): number {
  return ETAPA_ACTIVA[estado] ?? 0;
}

/** Plazo vigente del tipo o, si no hay, el registrado más recientemente. */
export function plazoDeTipo(plazos: readonly PlazoDto[], tipo: TipoPlazo): PlazoDto | null {
  const delTipo = plazos.filter(p => p.tipPlazo === tipo);
  return (
    delTipo.find(p => p.estPlazo === 'VIGENTE') ??
    [...delTipo].sort((a, b) => b.fecRegistro.localeCompare(a.fecRegistro))[0] ??
    null
  );
}

function fechaDeEtapa(clave: ClaveEtapa, c: CierreDetalleDto): string | null {
  switch (clave) {
    case 'ANEXO20':
      return c.fecRecepcionAnexo20;
    case 'VERIFICACION':
      return c.fecVerificacionCampo;
    case 'EVALUACION_UN':
      return c.fecDerivacionDE;
    case 'DIRECCION_EJECUTIVA':
      return c.fecDerivacionUAJ;
    case 'REVISION_UAJ':
      return c.fecRemisionProyectoRde;
    case 'RDE':
      return c.fecEmisionRde ?? c.fecCierreFormal;
  }
}

function notasDeEtapa(clave: ClaveEtapa, c: CierreDetalleDto, ronda: number): string[] {
  const notas: string[] = [];
  if (clave === 'ANEXO20' && c.flgDeOficio) {
    notas.push('Continuó de oficio: el plazo del Anexo 20 venció sin que la OA lo presentara.');
  }
  if (clave === 'EVALUACION_UN' && c.txtContingencia) {
    notas.push(`Contingencia por derivar fuera de plazo: ${c.txtContingencia}`);
  }
  if (clave === 'REVISION_UAJ' && c.estCierre === 'OBSERVADO_UAJ') {
    const enRonda = ronda > 0 ? ` (ronda ${ronda})` : '';
    notas.push(`Observado por la UAJ${enRonda}: la Unidad de Negocios debe subsanar y elevar de nuevo a la DE.`);
  } else if (clave === 'REVISION_UAJ' && ronda > 0 && ['DERIVADO_DE', 'EN_REVISION_UAJ'].includes(c.estCierre)) {
    notas.push(`Subsanadas las observaciones de la ronda ${ronda}: nueva revisión legal.`);
  }
  if (clave === 'RDE' && c.txtNumeroRde) {
    notas.push(`RDE N° ${c.txtNumeroRde}`);
  }
  return notas;
}

/** `ronda`: última ronda de observaciones de la UAJ (0 si no hubo), para las notas de la revisión legal. */
export function construirEtapas(cierre: CierreDetalleDto, plazos: readonly PlazoDto[], ronda = 0): EtapaCierre[] {
  const activa = indiceEtapaActiva(cierre.estCierre);
  return ETAPAS.map((def, indice) => ({
    clave: def.clave,
    numero: indice + 1,
    titulo: def.titulo,
    actor: def.actor,
    situacion: indice < activa ? 'completada' : indice === activa ? 'activa' : 'pendiente',
    fecha: indice < activa ? fechaDeEtapa(def.clave, cierre) : null,
    documentos: cierre.documentos.filter(d => def.documentos.includes(d.tipDocumento)),
    plazo: def.tipoPlazo ? plazoDeTipo(plazos, def.tipoPlazo) : null,
    notas: notasDeEtapa(def.clave, cierre, ronda)
  }));
}
