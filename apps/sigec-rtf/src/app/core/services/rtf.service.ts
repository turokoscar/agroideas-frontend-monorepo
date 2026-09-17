import { Injectable, inject, computed } from '@angular/core';
import { OaRtfService } from './oa-rtf.service';
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
  InformeComprobacionDto,
  CartaDto,
  RevisionAtencionItem,
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
  InformeComprobacionDto,
  CartaDto,
};

@Injectable({
  providedIn: 'root'
})
export class RtfService {
  private oaService = inject(OaRtfService);
  private unService = inject(UnGabineteService);
  private pasoService = inject(PasoCriticoService);

  // State proxies (mantenemos compatibilidad transparente para la vista)
  loading = this.oaService.loading;
  postulanteId = this.oaService.postulanteId;
  rtfId = this.oaService.rtfId;
  rtfStatus = this.oaService.rtfStatus;
  rtfDeadlineHours = this.oaService.rtfDeadlineHours;
  rtfDeadlineTipo = this.oaService.rtfDeadlineTipo;
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
  ultimaSincronizacionGastosF1 = this.oaService.ultimaSincronizacionGastosF1;
  actividadReciente = this.oaService.actividadReciente;


  oaBandejaList = this.oaService.oaBandejaList;
  oaBandejaTotal = this.oaService.oaBandejaTotal;
  oaBandejaEstado = this.oaService.oaBandejaEstado;

  // UN proxies (ADR-010: UN maneja todo el ciclo EN_REVISION → IN_REVISION_UN, sin actor UR
  // separado — un-gabinete.service.ts absorbió lo que vivía en ur-auditoria.service.ts)
  unRtfList = this.unService.unRtfList;
  unSelectedRtfId = this.unService.unSelectedRtfId;
  dashboardUnData = this.unService.dashboardUnData;
  unCabeceraSeleccionada = this.unService.cabeceraSeleccionada;
  unMetas = this.unService.metas;
  unIndicadores = this.unService.indicadores;
  unEvidencias = this.unService.evidencias;
  unGastosF1 = this.unService.gastosF1;
  unUltimaSincronizacionGastosF1 = this.unService.ultimaSincronizacionGastosF1;
  unRtfStatus = this.unService.rtfStatus;
  urEvaluacionItems = this.unService.urEvaluacionItems;
  urActaCampoArchivo = this.unService.urActaCampoArchivo;
  unAnexo18 = this.unService.anexo18;
  unCartas = this.unService.cartas;
  unPlazoReevaluacion = this.unService.plazoReevaluacion;

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
  loadEvidencias = (rtfId: number) => this.oaService.loadEvidencias(rtfId);
  loadGastosF1 = (rtfId: number) => this.oaService.loadGastosF1(rtfId);
  loadEstadoPlazo = (rtfId: number) => this.oaService.loadEstadoPlazo(rtfId);
  registrarRtf = (data: Partial<RtfCabeceraDto>) => this.oaService.registrarRtf(data);
  updateRtf = (rtfId: number, data: Partial<RtfCabeceraDto>) => this.oaService.updateRtf(rtfId, data);
  sincronizarGastosF1 = (rtfId: number) => this.oaService.sincronizarGastosF1(rtfId);
  enviarRtf = (rtfId: number) => this.oaService.enviarRtf(rtfId);
  uploadEvidencia = (rtfId: number, ideConcepto: number, tipConcepto: string, archivo: File, etiqueta?: string) => this.oaService.uploadEvidencia(rtfId, ideConcepto, tipConcepto, archivo, etiqueta);
  downloadEvidencia = (evidenciaId: number) => this.oaService.downloadEvidencia(evidenciaId);
  removeEvidencia = (evidenciaId: number) => this.oaService.removeEvidencia(evidenciaId);
  descargarAnexo17 = (rtfId: number) => this.oaService.descargarAnexo17(rtfId);
  descargarAnexo18 = (rtfId: number) => this.oaService.descargarAnexo18(rtfId);
  atenderObservaciones = (rtfId: number, respuestas: RevisionAtencionItem[]) => this.oaService.atenderObservaciones(rtfId, respuestas);
  loadActividadReciente = () => this.oaService.loadActividadReciente();
  loadDisbursements = (rtfId: number) => this.oaService.loadDisbursements(rtfId);
  updateMeta = (index: number, patch: Partial<MetaFisicaDto>) => this.oaService.updateMeta(index, patch);
  updateIndicador = (index: number, patch: Partial<IndicadorDto>) => this.oaService.updateIndicador(index, patch);
  loadBandejaOA = (estados: string[], cantidad?: number) => this.oaService.loadBandejaOA(estados, cantidad);

  // Delegaciones UN (incluye la verificación de campo opcional — ver comentario arriba)
  loadDashboardUn = () => this.unService.loadDashboardUn();
  loadBandejaUn = () => this.unService.loadBandejaUn();
  loadRtfCompleto = (rtfId: number) => this.unService.loadRtfCompleto(rtfId);
  sincronizarGastosF1UN = (rtfId: number) => this.unService.sincronizarGastosF1(rtfId);
  uploadActaCampo = (rtfId: number, archivo: File) => this.unService.uploadActaCampo(rtfId, archivo);
  guardarEvaluacionUr = (rtfId: number, items: UrEvaluacionItemDto[]) => this.unService.guardarEvaluacionUr(rtfId, items);
  obtenerEvaluacionUr = (rtfId: number) => this.unService.obtenerEvaluacionUr(rtfId);
  pliegoObservaciones = this.unService.pliegoObservaciones;
  derivarUn = (rtfId: number) => this.unService.derivarUn(rtfId);
  devolverTemprano = (rtfId: number, observacion: string) => this.unService.devolverTemprano(rtfId, observacion);
  aprobarUn = (rtfId: number, observacion?: string) => this.unService.aprobarUn(rtfId, observacion);
  rechazarUn = (rtfId: number, observacion?: string) => this.unService.rechazarUn(rtfId, observacion);
  devolverUn = (rtfId: number, observacion: string) => this.unService.devolverUn(rtfId, observacion);
  cargarAnexo18 = (rtfId: number) => this.unService.cargarAnexo18(rtfId);
  guardarAnexo18 = (rtfId: number, informe: Partial<InformeComprobacionDto>) => this.unService.guardarAnexo18(rtfId, informe);
  cargarCartas = (rtfId: number) => this.unService.cargarCartas(rtfId);
  cargarPlazoReevaluacion = (rtfId: number) => this.unService.cargarPlazoReevaluacion(rtfId);
  registrarCarta = (rtfId: number, tipCarta: string, numDocumento: string, fecNotificacion: string, canDiasOtorgados: number, archivo: File) =>
    this.unService.registrarCarta(rtfId, tipCarta, numDocumento, fecNotificacion, canDiasOtorgados, archivo);
  descargarCarta = (rtfId: number, ideCarta: number) => this.unService.descargarCarta(rtfId, ideCarta);

  // Delegaciones BD_SEL — lo programado sigue viniendo de BD_SEL; el avance ejecutado y la
  // evidencia se guardan localmente por RTF (ADR-009), de ahí el ideRtf en cada llamada.
  loadMetasPorPasoCritico = (pasoCriticoId: number, ideRtf?: number | null) => this.pasoService.loadMetasPorPasoCritico(pasoCriticoId, ideRtf);
  actualizarEjecucionMeta = (metaId: number, ideRtf: number, metaFisicaEjecutada: number, metaFinancieraEjecutada: number, comentarios?: string) =>
    this.pasoService.actualizarEjecucionMeta(metaId, ideRtf, metaFisicaEjecutada, metaFinancieraEjecutada, comentarios);
  subirEvidenciaMeta = (metaId: number, ideRtf: number, archivo: File) => this.pasoService.subirEvidenciaMeta(metaId, ideRtf, archivo);
  loadIndicadoresPorPasoCritico = (pasoCriticoId: number, ideRtf?: number | null) => this.pasoService.loadIndicadoresPorPasoCritico(pasoCriticoId, ideRtf);
  actualizarEjecucionIndicador = (id: number, ideRtf: number, metaProgramada: number, metaEjecutada: number, comentarios?: string) =>
    this.pasoService.actualizarEjecucionIndicador(id, ideRtf, metaProgramada, metaEjecutada, comentarios);
  subirEvidenciaIndicador = (indicadorId: number, ideRtf: number, archivo: File) =>
    this.pasoService.subirEvidenciaIndicador(indicadorId, ideRtf, archivo);
}
