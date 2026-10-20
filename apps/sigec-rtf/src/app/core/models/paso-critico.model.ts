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

/**
 * Último paso crítico del convenio: el de mayor mes de fin. El dashboard de sigec-api-rtf no expone
 * el número del paso, y los pasos son consecutivos, así que el que termina último es el de mayor
 * número — el mismo que la regla V3 de sigec-api-rtf usa para exigir el Anexo 20 (la API sigue
 * siendo la fuente de verdad; esto solo permite avisar antes de enviar).
 */
export function ultimoPasoCritico(pasos: readonly PasoCritico[]): PasoCritico | null {
  return pasos.reduce<PasoCritico | null>((ultimo, paso) => (!ultimo || paso.endMonth > ultimo.endMonth ? paso : ultimo), null);
}

export function esUltimoPasoCritico(pasos: readonly PasoCritico[], idePasoCritico: number | null | undefined): boolean {
  return idePasoCritico != null && ultimoPasoCritico(pasos)?.id === idePasoCritico;
}
