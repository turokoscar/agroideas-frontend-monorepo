import { RtfCabeceraDto } from './rtf-cabecera.dto';
import { MetaFisicaDto } from './meta-fisica.dto';
import { IndicadorDto } from './indicador.dto';
import { EvidenceDto } from './evidence.dto';
import { GastoF1Dto } from './gasto-f1.dto';

export interface UrCompletoDto {
  cabecera: RtfCabeceraDto;
  metas: MetaFisicaDto[];
  indicadores: IndicadorDto[];
  evidencias: EvidenceDto[];
  gastos: GastoF1Dto[];
  revisiones: unknown[];
  verificacionesCampo: unknown[];
}
