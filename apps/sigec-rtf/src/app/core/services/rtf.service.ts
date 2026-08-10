import { Injectable, inject, computed } from '@angular/core';
import { OaRtfService } from './oa-rtf.service';
import { UrAuditoriaService } from './ur-auditoria.service';
import { UnGabineteService } from './un-gabinete.service';
import { PasoCriticoService } from './paso-critico.service';
import {
  PasoCritico,
  Disbursement,
  MetaFisicaDto,
  IndicadorDto,
  RtfCabeceraDto,
  EvidenceDto,
  GastoF1Dto,
  ActividadReciente,
  PasoCriticoIndicador,
  PasoCriticoMeta,
  DashboardData,
  UrCompletoDto,
  UrEvaluacionItemDto,
  UrEvaluacionRequestDto,
  DashboardUnData,
} from '../models';

export type {
  PasoCritico,
  Disbursement,
  MetaFisicaDto,
  IndicadorDto,
  RtfCabeceraDto,
  EvidenceDto,
  GastoF1Dto,
  ActividadReciente,
  PasoCriticoIndicador,
  PasoCriticoMeta,
  DashboardData,
  UrCompletoDto,
  UrEvaluacionItemDto,
  UrEvaluacionRequestDto,
  DashboardUnData,
};

@Injectable({
  providedIn: 'root'
})
export class RtfService {
  private oaService = inject(OaRtfService);
  private urService = inject(UrAuditoriaService);
  private unService = inject(UnGabineteService);
  private pasoService = inject(PasoCriticoService);

  // State proxies (mantenemos compatibilidad transparente para la vista)
  loading = this.oaService.loading;
  postulanteId = this.oaService.postulanteId;
  rtfId = this.oaService.rtfId;
  rtfStatus = this.oaService.rtfStatus;
  rtfDeadlineHours = this.oaService.rtfDeadlineHours;
  convenioId = this.oaService.convenioId;
  oa = this.oaService.oa;
  budget = this.oaService.budget;
  disbursed = this.oaService.disbursed;
  durationMonths = this.oaService.durationMonths;
  currentMonth = this.oaService.currentMonth;
  activePasoNumero = this.oaService.activePasoNumero;
  totalPasos = this.oaService.totalPasos;
  physicalProgress = this.oaService.physicalProgress;

  pasos = this.oaService.pasos;
  disbursements = this.oaService.disbursements;

  txtActividadesRealizadas = this.oaService.txtActividadesRealizadas;
  txtActividadesNoRealizadas = this.oaService.txtActividadesNoRealizadas;
  txtLogros = this.oaService.txtLogros;
  txtDificultades = this.oaService.txtDificultades;
  txtCambiosPaso = this.oaService.txtCambiosPaso;

  metas = this.oaService.metas;
  indicadores = this.oaService.indicadores;
  evidencias = this.oaService.evidencias;
  gastosF1 = this.oaService.gastosF1;
  observacionesUR = this.oaService.observacionesUR;
  actividadReciente = this.oaService.actividadReciente;


  oaBandejaList = this.oaService.oaBandejaList;
  oaBandejaTotal = this.oaService.oaBandejaTotal;
  oaBandejaEstado = this.oaService.oaBandejaEstado;
  oaBandejaPagina = this.oaService.oaBandejaPagina;

  // UR proxies
  urRtfList = this.urService.urRtfList;
  urSelectedRtfId = this.urService.urSelectedRtfId;
  urEvaluacionItems = this.urService.urEvaluacionItems;
  urActaCampoArchivo = this.urService.urActaCampoArchivo;

  // UN proxies
  unRtfList = this.unService.unRtfList;
  unSelectedRtfId = this.unService.unSelectedRtfId;
  unEvaluacionItems = this.unService.unEvaluacionItems;
  unObservacionDevolver = this.unService.unObservacionDevolver;
  dashboardUnData = this.unService.dashboardUnData;

  // BD_SEL proxies
  pasoCriticoMetas = this.pasoService.pasoCriticoMetas;
  pasoCriticoId = this.pasoService.pasoCriticoId;
  pasoCriticoIndicadores = this.pasoService.pasoCriticoIndicadores;

  rtfStatusLabel = computed(() => {
    const map: Record<string, string> = {
      'PENDIENTE': 'En Edición',
      'EN_EDICION': 'En Edición',
      'EN_REVISION': 'En Revisión',
      'AUDITADO_CAMPO': 'Auditado en Campo',
      'IN_REVISION_UN': 'En Evaluación de Gabinete',
      'APROBADO': 'Aprobado',
      'RECHAZADO': 'Rechazado',
      'VENCIDO': 'Vencido',
    };
    return map[this.rtfStatus()] ?? this.rtfStatus();
  });

  // Delegaciones OA
  resolvePostulanteId = () => this.oaService.resolvePostulanteId();
  cargarPasosCriticosDelUsuario = () => this.oaService.cargarPasosCriticosDelUsuario();
  loadDashboard = (postulanteId: number) => this.oaService.loadDashboard(postulanteId);
  loadPasosCriticos = (postulanteId: number) => this.oaService.loadPasosCriticos(postulanteId);
  loadDetalleRtf = (rtfId: number) => this.oaService.loadDetalleRtf(rtfId);
  loadMetas = (rtfId: number) => this.oaService.loadMetas(rtfId);
  loadIndicadores = (rtfId: number) => this.oaService.loadIndicadores(rtfId);
  loadEvidencias = (rtfId: number) => this.oaService.loadEvidencias(rtfId);
  loadGastosF1 = (rtfId: number) => this.oaService.loadGastosF1(rtfId);
  loadEstadoPlazo = (rtfId: number) => this.oaService.loadEstadoPlazo(rtfId);
  registrarRtf = (data: Partial<RtfCabeceraDto>) => this.oaService.registrarRtf(data);
  updateRtf = (rtfId: number, data: Partial<RtfCabeceraDto>) => this.oaService.updateRtf(rtfId, data);
  updateMetas = (rtfId: number, metas: MetaFisicaDto[]) => this.oaService.updateMetas(rtfId, metas);
  updateIndicadores = (rtfId: number, indicadores: IndicadorDto[]) => this.oaService.updateIndicadores(rtfId, indicadores);
  enviarRtf = (rtfId: number) => this.oaService.enviarRtf(rtfId);
  uploadEvidencia = (rtfId: number, ideConcepto: number, tipConcepto: string, archivo: File) => this.oaService.uploadEvidencia(rtfId, ideConcepto, tipConcepto, archivo);
  downloadEvidencia = (evidenciaId: number) => this.oaService.downloadEvidencia(evidenciaId);
  removeEvidencia = (evidenciaId: number) => this.oaService.removeEvidencia(evidenciaId);
  loadActividadReciente = () => this.oaService.loadActividadReciente();
  loadDisbursements = (rtfId: number) => this.oaService.loadDisbursements(rtfId);
  updateMeta = (index: number, patch: Partial<MetaFisicaDto>) => this.oaService.updateMeta(index, patch);
  updateIndicador = (index: number, patch: Partial<IndicadorDto>) => this.oaService.updateIndicador(index, patch);
  loadBandejaOA = (estado: string, pagina?: number, cantidad?: number) => this.oaService.loadBandejaOA(estado, pagina, cantidad);

  // Delegaciones UR
  loadBandejaUr = () => this.urService.loadBandejaUr();
  loadRtfCompleto = (rtfId: number) => this.urService.loadRtfCompleto(rtfId);
  uploadActaCampo = (rtfId: number, archivo: File) => this.urService.uploadActaCampo(rtfId, archivo);
  guardarEvaluacionUr = (rtfId: number, items: UrEvaluacionItemDto[]) => this.urService.guardarEvaluacionUr(rtfId, items);
  derivarUn = (rtfId: number) => this.urService.derivarUn(rtfId);
  devolverRtf = (rtfId: number, observacion: string) => this.urService.devolverRtf(rtfId, observacion);

  // Delegaciones UN
  loadDashboardUn = () => this.unService.loadDashboardUn();
  loadBandejaUn = () => this.unService.loadBandejaUn();
  aprobarUn = (rtfId: number, observacion?: string) => this.unService.aprobarUn(rtfId, observacion);
  rechazarUn = (rtfId: number, observacion?: string) => this.unService.rechazarUn(rtfId, observacion);
  devolverUn = (rtfId: number, observacion: string) => this.unService.devolverUn(rtfId, observacion);

  // Delegaciones BD_SEL
  loadMetasPorPasoCritico = (pasoCriticoId: number) => this.pasoService.loadMetasPorPasoCritico(pasoCriticoId);
  actualizarEjecucionMeta = (metaId: number, metaFisicaEjecutada: number, metaFinancieraEjecutada: number, comentarios?: string) =>
    this.pasoService.actualizarEjecucionMeta(metaId, metaFisicaEjecutada, metaFinancieraEjecutada, comentarios);
  subirEvidenciaMeta = (pasoCriticoId: number, metaId: number, archivo: File) => this.pasoService.subirEvidenciaMeta(pasoCriticoId, metaId, archivo);
  loadIndicadoresPorPasoCritico = (pasoCriticoId: number) => this.pasoService.loadIndicadoresPorPasoCritico(pasoCriticoId);
  actualizarEjecucionIndicador = (id: number, metaProgramada: number, metaEjecutada: number, comentarios?: string) =>
    this.pasoService.actualizarEjecucionIndicador(id, metaProgramada, metaEjecutada, comentarios);
  subirEvidenciaIndicador = (pasoCriticoId: number, indicadorId: number, archivo: File) =>
    this.pasoService.subirEvidenciaIndicador(pasoCriticoId, indicadorId, archivo);
}
