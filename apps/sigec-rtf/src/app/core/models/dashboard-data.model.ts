import { PasoCritico } from './paso-critico.model';
import { Disbursement } from './disbursement.model';

export interface DashboardData {
  convenioId: string;
  oa: string;
  budget: number;
  disbursed: number;
  durationMonths: number;
  currentMonth: number;
  activeRtfStatus: string;
  activePasoNumero: number;
  totalPasos: number;
  physicalProgress: number;
  pasos: PasoCritico[];
  disbursements: Disbursement[];
}
