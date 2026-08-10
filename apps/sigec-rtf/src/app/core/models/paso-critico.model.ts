export interface PasoCritico {
  id: number;
  label: string;
  startMonth: number;
  endMonth: number;
  start: Date;
  end: Date;
  status: 'Aprobado' | 'Activo' | 'Pendiente' | 'Validado' | 'Vencido' | 'Rechazado';
  rtfId?: number;
}
