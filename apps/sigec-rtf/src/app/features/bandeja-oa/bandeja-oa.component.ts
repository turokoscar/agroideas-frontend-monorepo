import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RtfService, RtfCabeceraDto } from '../../core/services/rtf.service';
import { Subscription } from 'rxjs';
import {
  ToastService,
  UiDataTableComponent,
  TableColumn,
  UiFilterBarComponent,
  UiStatusPillComponent,
  StatusType,
  UiPdfViewerComponent,
  UIButtonComponent
} from '@agroideas/ui';
import { DocumentacionRtfModalComponent } from '../documentacion-rtf/documentacion-rtf-modal.component';

interface BandejaTab {
  key: string;
  label: string;
  /** Estados backend que este tab consolida en una sola llamada (ver `loadBandejaOA`). */
  estados: string[];
}

@Component({
  selector: 'app-bandeja-oa',
  standalone: true,
  imports: [
    CommonModule,
    UiDataTableComponent,
    UiFilterBarComponent,
    UiStatusPillComponent,
    UiPdfViewerComponent,
    UIButtonComponent,
    DocumentacionRtfModalComponent
  ],
  templateUrl: './bandeja-oa.component.html'
})
export class BandejaOAComponent implements OnInit, OnDestroy {
  rtfService = inject(RtfService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private subs = new Subscription();

  /**
   * ADR-014 (frontend) Fase 7: `OBSERVADO` es el tab que faltaba (motivo original de este
   * rediseño). Los tres estados internos de AGROIDEAS (EN_REVISION/AUDITADO_CAMPO/
   * IN_REVISION_UN) se consolidan en un solo tab — a la OA no le importa el sub-estado interno
   * de la UN, solo que el expediente ya no está en su cancha. Mismo patrón de consolidación
   * `estados=` CSV que ya usa `UnGabineteService.loadBandejaUn` (ADR-013).
   */
  tabs: BandejaTab[] = [
    { key: 'PENDIENTE', label: 'Pendiente', estados: ['PENDIENTE'] },
    { key: 'EN_EDICION', label: 'En Edición', estados: ['EN_EDICION'] },
    { key: 'OBSERVADO', label: 'Con Observaciones', estados: ['OBSERVADO'] },
    { key: 'EN_REVISION', label: 'En Revisión en AGROIDEAS', estados: ['EN_REVISION', 'AUDITADO_CAMPO', 'IN_REVISION_UN'] },
    { key: 'APROBADO', label: 'Aprobado', estados: ['APROBADO'] },
    { key: 'RECHAZADO', label: 'Rechazado', estados: ['RECHAZADO'] },
    { key: 'VENCIDO', label: 'Vencido', estados: ['VENCIDO'] },
  ];

  activeTabKey = signal<string>('PENDIENTE');
  loading = signal(false);
  filtroTexto = signal('');

  activeTabLabel = computed(() => this.tabs.find(t => t.key === this.activeTabKey())?.label ?? '');

  /** Búsqueda 100% cliente sobre la lista ya cargada — mismo patrón que ADR-013 dejó en `un-gabinete`. */
  listaFiltrada = computed(() => {
    const texto = this.filtroTexto().trim().toLowerCase();
    const lista = this.rtfService.oaBandejaList();
    if (!texto) return lista;
    return lista.filter(rtf =>
      String(rtf.ideRtf ?? '').includes(texto) ||
      String(rtf.numPasoCritico ?? '').toLowerCase().includes(texto)
    );
  });

  columns: TableColumn[] = [
    { field: 'ideRtf', header: 'ID RTF', align: 'left', width: '90px' },
    { field: 'numPasoCritico', header: 'Paso Crítico', align: 'left', width: '120px' },
    { field: 'estRtf', header: 'Estado', align: 'left', type: 'custom' },
    { field: 'plazo', header: 'Plazo', align: 'left', type: 'custom' },
    { field: 'fecRegistro', header: 'Fec. Registro', align: 'left', type: 'date' },
  ];

  ngOnInit() {
    this.cargarBandeja();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  private cargarBandeja() {
    const tab = this.tabs.find(t => t.key === this.activeTabKey());
    if (!tab) return;
    this.loading.set(true);
    this.subs.add(
      this.rtfService.loadBandejaOA(tab.estados).subscribe({
        next: () => this.loading.set(false),
        error: () => {
          this.loading.set(false);
          this.toast.error('No se pudo cargar la bandeja', 'Intenta nuevamente en unos minutos.');
        }
      })
    );
  }

  cambiarTab(key: string) {
    this.activeTabKey.set(key);
    this.filtroTexto.set('');
    this.cargarBandeja();
  }

  /**
   * ADR-012: `RtfCabeceraDto.idePasoCritico` (id real BD_SEL) reemplaza a `numPasoCritico` (el
   * ordinal) para reconstruir la ruta `/rtf/pasos-criticos/:idpc/registrar` al reabrir un RTF
   * existente — antes esto era imposible y forzaba la rama legacy de `OaRegistroComponent`
   * (`loadMetas`/`loadIndicadores` contra las tablas ya retiradas). Si por algún motivo
   * `idePasoCritico` aún no se resolvió (fila muy antigua, ver resolución perezosa del backend),
   * se cae a la ruta sin `idpc` como respaldo.
   */
  abrirRtf(rtf: RtfCabeceraDto) {
    if (!rtf.ideRtf) return;
    this.rtfService.rtfId.set(rtf.ideRtf);
    const ruta = rtf.idePasoCritico != null
      ? ['/rtf/pasos-criticos', rtf.idePasoCritico, 'registrar']
      : ['/rtf/pasos-criticos/registrar'];
    this.router.navigate(ruta);
  }

  enviarRtf(rtf: RtfCabeceraDto) {
    this.navegarConRtf(rtf, '/rtf/pasos-criticos/enviar');
  }

  nuevoRtf() {
    this.router.navigate(['/rtf/pasos-criticos/registrar']);
  }

  /**
   * ADR-014 (frontend) punto 3-4: la pantalla real del pliego de observaciones todavía está en
   * modo lectura (Fases 1-6 pendientes) — este botón ya navega y deja el `rtfId` correcto en
   * memoria, así que empieza a funcionar sin más cambios en `bandeja-oa` en cuanto esas fases
   * se completen.
   */
  atenderObservaciones(rtf: RtfCabeceraDto) {
    this.navegarConRtf(rtf, '/rtf/pasos-criticos/observaciones');
  }

  private navegarConRtf(rtf: RtfCabeceraDto, ruta: string) {
    if (!rtf.ideRtf) return;
    this.rtfService.rtfId.set(rtf.ideRtf);
    this.router.navigate([ruta]);
  }

  // PDF viewer state (Anexo 18)
  pdfViewerOpen = signal(false);
  pdfViewerFilename = signal<string | null>(null);
  pdfViewerFileUrl = signal<string | null>(null);
  pdfViewerDownloadUrl = signal<string | null>(null);
  cargandoAnexo18 = signal(false);

  verAnexo18(rtf: RtfCabeceraDto) {
    if (!rtf.ideRtf) return;
    this.pdfViewerFilename.set(`Anexo18_RTF_${rtf.ideRtf}.pdf`);
    this.pdfViewerOpen.set(true);
    this.cargandoAnexo18.set(true);
    this.rtfService.descargarAnexo18(rtf.ideRtf).subscribe({
      next: blob => {
        this.cargandoAnexo18.set(false);
        const url = URL.createObjectURL(blob);
        this.pdfViewerFileUrl.set(url);
        this.pdfViewerDownloadUrl.set(url);
      },
      error: () => {
        this.cargandoAnexo18.set(false);
        this.toast.error('Error', 'No se pudo generar el Anexo 18.');
        this.pdfViewerFileUrl.set(null);
        this.pdfViewerDownloadUrl.set(null);
      }
    });
  }

  onPdfViewerClose() {
    URL.revokeObjectURL(this.pdfViewerFileUrl() ?? '');
    this.pdfViewerOpen.set(false);
    this.pdfViewerFilename.set(null);
    this.pdfViewerFileUrl.set(null);
    this.pdfViewerDownloadUrl.set(null);
  }

  statusLabel(estado?: string): string {
    const map: Record<string, string> = {
      'PENDIENTE': 'Pendiente',
      'EN_EDICION': 'En Edición',
      'OBSERVADO': 'Con Observaciones',
      'EN_REVISION': 'En Revisión',
      'AUDITADO_CAMPO': 'Auditado en Campo',
      'IN_REVISION_UN': 'En Evaluación de Gabinete',
      'APROBADO': 'Aprobado',
      'RECHAZADO': 'Rechazado',
      'VENCIDO': 'Vencido',
    };
    return map[estado ?? ''] ?? estado ?? '';
  }

  /**
   * `app-ui-status-pill` (@agroideas/ui) tiene una paleta cerrada de estados genéricos que no
   * incluye los estados propios del flujo RTF — se aproxima cada uno a la paleta más cercana
   * solo para el color; la etiqueta real se pasa aparte vía `[text]="statusLabel(...)"`. Mismo
   * criterio ya documentado en `UnGabineteComponent.estadoPillStatus`.
   */
  estadoPillStatus(estado?: string): StatusType {
    switch (estado) {
      case 'APROBADO': return 'Aprobado';
      case 'RECHAZADO':
      case 'VENCIDO': return 'Rechazado';
      case 'OBSERVADO': return 'Alta';
      case 'EN_REVISION':
      case 'AUDITADO_CAMPO':
      case 'IN_REVISION_UN': return 'Media';
      case 'PENDIENTE':
      case 'EN_EDICION':
      default: return 'Pendiente';
    }
  }

  /** Cálculo 100% cliente sobre `fecLimite`, que ya viaja en cada fila del listado. */
  diasRestantes(fecLimite?: string): { texto: string; urgente: boolean } {
    if (!fecLimite) return { texto: '—', urgente: false };
    const hoy = new Date();
    const limite = new Date(fecLimite);
    const dias = Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (dias < 0) return { texto: `Vencido hace ${Math.abs(dias)}d`, urgente: true };
    if (dias === 0) return { texto: 'Vence hoy', urgente: true };
    return { texto: `Vence en ${dias}d`, urgente: dias <= 3 };
  }
}
