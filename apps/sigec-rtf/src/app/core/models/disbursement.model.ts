export interface Disbursement {
  id: string;
  item: string;
  activityId: string;
  amount: number;
  date: string;
  status: 'Ejecutado' | 'Pendiente';
}
