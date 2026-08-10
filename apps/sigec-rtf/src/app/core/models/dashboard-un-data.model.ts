import { DashboardUnConvenioItemDto } from './dashboard-un-convenio-item.dto';

export interface DashboardUnData {
  totalRtfs: number;
  aprobados: number;
  rechazados: number;
  pendientes: number;
  enEdicion: number;
  enRevision: number;
  inRevisionUn: number;
  vencidos: number;
  avanceFisicoPromedio: number;
  convenios: DashboardUnConvenioItemDto[];
}
