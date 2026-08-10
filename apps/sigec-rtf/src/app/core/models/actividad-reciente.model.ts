export interface ActividadReciente {
  id: number;
  tipo: 'aprobado' | 'desembolso' | 'edicion' | 'observacion' | 'envio' | 'vencido' | 'alerta';
  mensaje: string;
  tiempo: string;
  icono: string;
}
