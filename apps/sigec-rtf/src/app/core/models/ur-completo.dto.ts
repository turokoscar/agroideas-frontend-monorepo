import { RtfCabeceraDto } from './rtf-cabecera.dto';
import { EvidenceDto } from './evidence.dto';

// ADR-012: ya no incluye metas/indicadores/gastos — cada uno se carga por su endpoint dedicado
// (/pasos-criticos/{id}/metas|indicadores, /rtfs/{id}/gastos-f1), la misma fuente que usa la OA.
export interface UrCompletoDto {
  cabecera: RtfCabeceraDto;
  evidencias: EvidenceDto[];
  revisiones: unknown[];
  verificacionesCampo: unknown[];
}
