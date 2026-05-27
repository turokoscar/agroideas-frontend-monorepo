import { StatusType } from '@agroideas/ui';

export const ESTADOS_INFORME = [
  { cod: 'BORRADOR', label: 'Borrador', color: 'bg-gray-100 text-gray-600' },
  { cod: '1', label: 'Borrador', color: 'bg-gray-100 text-gray-600' },
  { cod: 'GENERADO', label: 'Generado', color: 'bg-blue-100 text-blue-700' },
  { cod: '2', label: 'Generado', color: 'bg-blue-100 text-blue-700' },
  { cod: 'PRESENTADO', label: 'Presentado', color: 'bg-green-100 text-green-700' },
  { cod: '3', label: 'Presentado', color: 'bg-green-100 text-green-700' }
];

export function getEstadoClass(cod: string): string {
  const estado = ESTADOS_INFORME.find(e => e.cod === cod);
  return estado ? estado.color : 'bg-gray-100 text-gray-600';
}

export function getEstadoLabel(cod: string): string {
  const estado = ESTADOS_INFORME.find(e => e.cod === cod);
  return estado ? estado.label : cod;
}

export function getResultadoLabel(resultado: string): { text: string; class: string } {
  switch (resultado) {
    case 'EXITOSO':
      return { text: 'Exitoso', class: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
    case 'ERROR_PARCIAL':
      return { text: 'Error Parcial', class: 'bg-amber-50 text-amber-600 border-amber-100' };
    case 'FALLIDO':
      return { text: 'Fallido', class: 'bg-red-50 text-red-600 border-red-100' };
    default:
      return { text: resultado, class: 'bg-slate-50 text-slate-600 border-slate-100' };
  }
}

export function getSyncStatus(estado: string): { status: StatusType; text: string } {
  const map: Record<string, { status: StatusType; text: string }> = {
    sincronizado: { status: 'Aprobado', text: 'Sincronizado' },
    pendiente: { status: 'Pendiente', text: 'Pendiente' },
    error: { status: 'Rechazado', text: 'Error' },
    exitoso: { status: 'Aprobado', text: 'Exitoso' },
    error_parcial: { status: 'Suspendido', text: 'Error Parcial' }
  };
  return map[estado] ?? { status: 'Pendiente', text: estado };
}
