import { RevisionDto } from './revision.dto';

/**
 * ADR-014 Parte 4: respuesta de `GET rtfs/{id}/evaluaciones` — filas ya guardadas (para
 * reponer la UI al reabrir la pantalla) y el pliego de observaciones ya armado por el backend
 * (mismo texto que se notificaría al Devolver), como confirmación visual sin ejecutar ninguna
 * transición de estado.
 */
export interface EvaluacionUrEstadoDto {
  revisiones: RevisionDto[];
  pliegoObservaciones: string;
}
