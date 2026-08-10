import { UrEvaluacionItemDto } from './ur-evaluacion-item.dto';

export interface UrEvaluacionRequestDto {
  ideRtf: number;
  items: UrEvaluacionItemDto[];
}
