import { GastoF1Dto } from './gasto-f1.dto';

/** GET rtfs/{id}/gastos-f1/relacion (sigec-api-rtf, ADR-017). Formato "4. Relación de Gastos
 * Realizados - F1" (Instructivo SEL p. 101): agrupa el snapshot de Gastos F1 por ítem de marco
 * lógico, con el desglose real Monto Aprobado OA/AGROIDEAS por ítem. */
export interface RelacionGastosF1ItemDto {
  marcoLogicoID: number;
  descripcion?: string;
  unidadMedida?: string;
  cantidad: number;
  costoUnitario?: number;
  montoAprobadoOa: number;
  montoAprobadoAgroideas: number;
  montoAprobadoTotal: number;
  montoFacturado: number;
  porcentajeEjecucion: number;
  /** Aprobado − Facturado. Negativo = excedente, asumido por la OA. */
  montoDiferencial: number;
  comprobantes: GastoF1Dto[];
}

export interface RelacionGastosF1Dto {
  items: RelacionGastosF1ItemDto[];
  /** Gastos sincronizados cuyo ideItemMl no matchea ningún ítem del paso crítico actual. */
  gastosSinClasificar: GastoF1Dto[];
  totalAprobadoOa: number;
  totalAprobadoAgroideas: number;
  totalAprobado: number;
  totalFacturado: number;
  totalDiferencial: number;
}
