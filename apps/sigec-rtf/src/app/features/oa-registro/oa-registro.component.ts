import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RtfService, MetaFisicaDto, IndicadorDto, PasoCriticoIndicador } from '../../core/services/rtf.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService, UiCountdownBannerComponent, UiPdfViewerComponent, UiDataTableComponent, UIModalComponent, TableColumn } from '@agroideas/ui';

@Component({
  selector: 'app-oa-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, PercentPipe, UiCountdownBannerComponent, UiPdfViewerComponent, UiDataTableComponent, UIModalComponent],
  providers: [DecimalPipe],
  templateUrl: './oa-registro.component.html'
})
export class OaRegistroComponent implements OnInit {
  rtfService = inject(RtfService);
  authService = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  useBdSelMetas = signal(false);

  filteredPasoCriticoMetas = computed(() => {
    return this.rtfService.pasoCriticoMetas().filter(meta => meta.metaFisicaProgramada > 0);
  });

  filteredLegacyMetas = computed(() => {
    return this.rtfService.metas().filter(meta => meta.canProgramada > 0);
  });

  // Column definitions for UiDataTableComponent
  metasSelColumns: TableColumn[] = [
    { field: 'descripcion', header: 'Actividad', align: 'left' },
    { field: 'unidadMedida', header: 'Unidad', align: 'left', width: '100px' },
    { field: 'metaFisicaProgramada', header: 'Física Prog.', align: 'right', type: 'number' },
    { field: 'metaFisicaEjecutada', header: 'Física Ejec.', align: 'right', type: 'custom' },
    { field: 'metaFisicaAvance', header: '%', align: 'right', type: 'custom' }
  ];

  metasLegacyColumns: TableColumn[] = [
    { field: 'actividad', header: 'Actividad', align: 'left' },
    { field: 'unidad', header: 'Unidad', align: 'left', width: '120px' },
    { field: 'canProgramada', header: 'Programado', align: 'right', type: 'number' },
    { field: 'canEjecutada', header: 'Ejecutado', align: 'right', type: 'custom' },
    { field: 'avancePct', header: '% Avance', align: 'right', type: 'custom' }
  ];

  indicadoresSelColumns: TableColumn[] = [
    { field: 'cadenaProductiva', header: 'Cadena', align: 'left' },
    { field: 'indicador', header: 'Indicador', align: 'left' },
    { field: 'unidadMedida', header: 'Unidad', align: 'left', width: '100px' },
    { field: 'lineaBase', header: 'Línea Base', align: 'right', type: 'number' },
    { field: 'metaProgramada', header: 'Programado', align: 'right', type: 'number' },
    { field: 'metaEjecutada', header: 'Ejecutado', align: 'right', type: 'custom' },
    { field: 'avancePct', header: '% Avance', align: 'right', type: 'custom' }
  ];

  indicadoresLegacyColumns: TableColumn[] = [
    { field: 'nombre', header: 'Indicador', align: 'left' },
    { field: 'unidad', header: 'Unidad', align: 'left', width: '120px' },
    { field: 'lineaBase', header: 'Línea Base', align: 'right', type: 'number' },
    { field: 'canProgramado', header: 'Programado', align: 'right', type: 'number' },
    { field: 'canEjecutado', header: 'Ejecutado', align: 'right', type: 'custom' },
    { field: 'avancePct', header: '% Avance', align: 'right', type: 'custom' }
  ];

  desembolsosColumns: TableColumn[] = [
    { field: 'item', header: 'Item / Actividad', align: 'left' },
    { field: 'amount', header: 'Monto', align: 'right', type: 'currency' },
    { field: 'date', header: 'Fecha', align: 'left', type: 'date' },
    { field: 'status', header: 'Estado', align: 'left', type: 'custom' }
  ];

  gastosColumns: TableColumn[] = [
    { field: 'txtItemNombre', header: 'Item', align: 'left' },
    { field: 'txtUnidadMedida', header: 'Unidad', align: 'left', width: '100px' },
    { field: 'canCantidad', header: 'Cantidad', align: 'right', type: 'number' },
    { field: 'numPrecioAdjudicado', header: 'P. Adjudicado', align: 'right', type: 'currency' },
    { field: 'numMontoRendido', header: 'Monto Rendido', align: 'right', type: 'currency' },
    { field: 'txtProveedorNombre', header: 'Proveedor', align: 'left' }
  ];

  ngOnInit() {
    const idpc = this.route.snapshot.paramMap.get('idpc');
    if (idpc) {
      this.useBdSelMetas.set(true);
      const pasoCriticoId = Number(idpc);
      this.rtfService.loadMetasPorPasoCritico(pasoCriticoId).subscribe();
      this.rtfService.loadIndicadoresPorPasoCritico(pasoCriticoId).subscribe();
      
      const initializeRtfAndHeader = (rtfId: number) => {
        if (rtfId) {
          this.rtfService.loadDetalleRtf(rtfId).subscribe();
          this.rtfService.loadEvidencias(rtfId).subscribe();
          this.rtfService.loadGastosF1(rtfId).subscribe();
          this.rtfService.loadEstadoPlazo(rtfId).subscribe();
        }
      };

      const rtfId = this.rtfService.rtfId();
      if (rtfId) {
        initializeRtfAndHeader(rtfId);
      } else {
        // En caso de F5 / recarga, recuperar postulanteId y cargar dashboard para rellenar los tiles
        const usuarioId = Number(this.authService.user()?.id);
        if (usuarioId) {
          this.rtfService.resolvePostulanteId().subscribe({
            next: (postulanteId) => {
              this.rtfService.loadDashboard(postulanteId).subscribe({
                next: (dashData) => {
                  const pasos = dashData.pasos || [];
                  const pc = pasos.find((p: any) => p.id === pasoCriticoId);
                  if (pc?.rtfId) {
                    this.rtfService.rtfId.set(pc.rtfId);
                    initializeRtfAndHeader(pc.rtfId);
                  }
                }
              });
            }
          });
        }
      }
    } else {
      const rtfId = this.rtfService.rtfId();
      if (rtfId) {
        this.rtfService.loadDetalleRtf(rtfId).subscribe();
        this.rtfService.loadMetas(rtfId).subscribe();
        this.rtfService.loadIndicadores(rtfId).subscribe();
        this.rtfService.loadEvidencias(rtfId).subscribe();
        this.rtfService.loadGastosF1(rtfId).subscribe();
        this.rtfService.loadEstadoPlazo(rtfId).subscribe();
      }
    }
  }

  // Tab state
  activeTab = signal<'R1' | 'T1' | 'R2' | 'F1'>('R1');

  tabs = [
    { key: 'R1' as const, label: 'R1 - Información Cualitativa' },
    { key: 'T1' as const, label: 'T1 - Metas Físicas' },
    { key: 'R2' as const, label: 'R2 - Indicadores' },
    { key: 'F1' as const, label: 'F1 - Consolidado Financiero' }
  ];

  // Modal state
  modalOpen = signal(false);
  modalMode = signal<'meta' | 'indicador'>('meta');
  modalIndex = signal(0);

  editEjecutado = signal<number | null>(null);
  editMetaProgramada = signal<number>(0);
  editMetaFinancieraEjecutada = signal<number>(0);
  editComentario = signal('');

  pendingFiles = signal<{ name: string; size: number; file: File }[]>([]);

  // PDF viewer state
  pdfViewerOpen = signal(false);
  pdfViewerFilename = signal<string | null>(null);
  pdfViewerFileUrl = signal<string | null>(null);
  pdfViewerDownloadUrl = signal<string | null>(null);

  // Action states
  isSaving = signal(false);
  isSubmitting = signal(false);

  // Computed
  canSubmit = computed(() => {
    if (this.useBdSelMetas()) {
      const metasConAvance = this.rtfService.pasoCriticoMetas().filter(m => m.metaFisicaEjecutada != null).length;
      const indicadoresConAvance = this.rtfService.pasoCriticoIndicadores().filter(i => i.metaEjecutada != null).length;
      return metasConAvance > 0 || indicadoresConAvance > 0;
    }
    const metasConAvance = this.rtfService.metas().filter(m => m.canEjecutada != null).length;
    const indicadoresConAvance = this.rtfService.indicadores().filter(i => i.canEjecutado != null).length;
    return metasConAvance > 0 || indicadoresConAvance > 0;
  });

  activeModalItem = computed(() => {
    const idx = this.modalIndex();
    if (this.modalMode() === 'meta') {
      return this.useBdSelMetas()
        ? this.rtfService.pasoCriticoMetas()[idx]
        : this.rtfService.metas()[idx];
    } else {
      return this.useBdSelMetas()
        ? this.rtfService.pasoCriticoIndicadores()[idx]
        : this.rtfService.indicadores()[idx];
    }
  });

  asAny(val: any): any {
    return val;
  }

  modalTitle = computed(() => {
    if (this.modalMode() === 'meta') {
      if (this.useBdSelMetas()) {
        const meta = this.rtfService.pasoCriticoMetas()[this.modalIndex()];
        return (meta ? meta.descripcion : 'Meta Física') ?? '';
      }
      const meta = this.rtfService.metas()[this.modalIndex()];
      return (meta ? meta.actividad : 'Meta Física') ?? '';
    }
    if (this.useBdSelMetas()) {
      const ind = this.rtfService.pasoCriticoIndicadores()[this.modalIndex()];
      return (ind ? (ind.indicador ?? 'Indicador') : 'Indicador') ?? '';
    }
    const ind = this.rtfService.indicadores()[this.modalIndex()];
    return (ind ? ind.nombre : 'Indicador') ?? '';
  });

  modalUnidad = computed(() => {
    if (this.modalMode() === 'meta') {
      if (this.useBdSelMetas()) {
        return this.rtfService.pasoCriticoMetas()[this.modalIndex()]?.unidadMedida ?? '';
      }
      return this.rtfService.metas()[this.modalIndex()]?.unidad ?? '';
    }
    if (this.useBdSelMetas()) {
      return this.rtfService.pasoCriticoIndicadores()[this.modalIndex()]?.unidadMedida ?? '';
    }
    return this.rtfService.indicadores()[this.modalIndex()]?.unidad ?? '';
  });

  modalEvidencias = computed(() => {
    if (this.useBdSelMetas()) return [];
    if (this.modalMode() === 'meta') {
      const meta = this.rtfService.metas()[this.modalIndex()];
      return this.rtfService.evidencias().filter(e => e.ideConcepto === meta?.ideMetaFisica && e.tipConcepto === 'METAFISICA');
    }
    const ind = this.rtfService.indicadores()[this.modalIndex()];
    return this.rtfService.evidencias().filter(e => e.ideConcepto === ind?.ideIndicadorAvance && e.tipConcepto === 'INDICADOR');
  });

  openModal(mode: 'meta' | 'indicador', row: any) {
    this.modalMode.set(mode);

    let index = 0;
    if (mode === 'meta') {
      if (this.useBdSelMetas()) {
        index = this.rtfService.pasoCriticoMetas().findIndex(m => m.id === row.id);
      } else {
        index = this.rtfService.metas().findIndex(m => m.ideMetaFisica === row.ideMetaFisica);
      }
    } else {
      if (this.useBdSelMetas()) {
        index = this.rtfService.pasoCriticoIndicadores().findIndex(i => i.id === row.id);
      } else {
        index = this.rtfService.indicadores().findIndex(i => i.ideIndicadorAvance === row.ideIndicadorAvance);
      }
    }
    
    this.modalIndex.set(index);

    if (mode === 'meta') {
      if (this.useBdSelMetas()) {
        const meta = this.rtfService.pasoCriticoMetas()[index];
        this.editEjecutado.set(meta.metaFisicaEjecutada);
        this.editMetaFinancieraEjecutada.set(meta.metaFinancieraEjecutada);
        this.editComentario.set(meta.comentarios ?? '');
      } else {
        const meta = this.rtfService.metas()[index];
        this.editEjecutado.set(meta.canEjecutada);
        this.editMetaFinancieraEjecutada.set(0);
        this.editComentario.set(meta.txtComentario ?? '');
      }
    } else if (this.useBdSelMetas()) {
      const ind = this.rtfService.pasoCriticoIndicadores()[index];
      this.editEjecutado.set(ind.metaEjecutada);
      this.editMetaProgramada.set(ind.metaProgramada);
      this.editMetaFinancieraEjecutada.set(0);
      this.editComentario.set(ind.comentarios ?? '');
    } else {
      const ind = this.rtfService.indicadores()[index];
      this.editEjecutado.set(ind.canEjecutado);
      this.editMetaProgramada.set(0);
      this.editMetaFinancieraEjecutada.set(0);
      this.editComentario.set(ind.txtComentario ?? '');
    }

    this.pendingFiles.set([]);
    this.modalOpen.set(true);
  }

  closeModal() {
    this.modalOpen.set(false);
    this.pendingFiles.set([]);
  }

  saveModalAvance() {
    const value = this.editEjecutado();
    if (value == null || value < 0) return;

    if (this.useBdSelMetas() && this.modalMode() === 'meta') {
      const meta = this.rtfService.pasoCriticoMetas()[this.modalIndex()];
      const financiera = this.editMetaFinancieraEjecutada();
      this.rtfService.actualizarEjecucionMeta(meta.id, value, financiera, this.editComentario()).subscribe({
        next: () => {
          this.rtfService.pasoCriticoMetas.update(prev => prev.map((m, i) =>
            i === this.modalIndex() ? { ...m, metaFisicaEjecutada: value, metaFinancieraEjecutada: financiera, comentarios: this.editComentario() } : m
          ));
        },
        error: err => this.toast.error('Error', `No se pudo guardar el avance: ${err.message}`)
      });
    } else if (this.useBdSelMetas() && this.modalMode() === 'indicador') {
      const ind = this.rtfService.pasoCriticoIndicadores()[this.modalIndex()];
      const metaProgramada = this.editMetaProgramada();
      this.rtfService.actualizarEjecucionIndicador(ind.id, metaProgramada, value, this.editComentario()).subscribe({
        next: () => {
          this.rtfService.pasoCriticoIndicadores.update(prev => prev.map((m, i) =>
            i === this.modalIndex() ? { ...m, metaProgramada, metaEjecutada: value, comentarios: this.editComentario() } : m
          ));
        },
        error: err => this.toast.error('Error', `No se pudo guardar el avance: ${err.message}`)
      });
    } else if (this.modalMode() === 'meta') {
      this.rtfService.updateMeta(this.modalIndex(), {
        canEjecutada: value,
        txtComentario: this.editComentario()
      });
    } else {
      this.rtfService.updateIndicador(this.modalIndex(), {
        canEjecutado: value,
        txtComentario: this.editComentario()
      });
    }

    // Upload pending files
    const files = this.pendingFiles();
    if (this.useBdSelMetas() && this.modalMode() === 'meta') {
      const pasoCriticoId = this.rtfService.pasoCriticoId();
      const meta = this.rtfService.pasoCriticoMetas()[this.modalIndex()];
      if (pasoCriticoId && files.length > 0) {
        for (const f of files) {
          this.rtfService.subirEvidenciaMeta(pasoCriticoId, meta.id, f.file).subscribe({
            error: err => this.toast.error('Error', `No se pudo subir ${f.name}: ${err.message}`)
          });
        }
      }
    } else if (this.useBdSelMetas() && this.modalMode() === 'indicador') {
      const pasoCriticoId = this.rtfService.pasoCriticoId();
      const ind = this.rtfService.pasoCriticoIndicadores()[this.modalIndex()];
      if (pasoCriticoId && files.length > 0) {
        for (const f of files) {
          this.rtfService.subirEvidenciaIndicador(pasoCriticoId, ind.id, f.file).subscribe({
            error: err => this.toast.error('Error', `No se pudo subir ${f.name}: ${err.message}`)
          });
        }
      }
    } else {
      const rtfId = this.rtfService.rtfId();
      const ideConcepto = this.modalMode() === 'meta'
        ? (this.rtfService.metas()[this.modalIndex()]?.ideMetaFisica ?? 0)
        : (this.rtfService.indicadores()[this.modalIndex()]?.ideIndicadorAvance ?? 0);
      const tipConcepto = this.modalMode() === 'meta' ? 'METAFISICA' : 'INDICADOR';
      if (rtfId && files.length > 0) {
        for (const f of files) {
          this.rtfService.uploadEvidencia(rtfId, ideConcepto, tipConcepto, f.file).subscribe({
            error: err => this.toast.error('Error', `No se pudo subir ${f.name}: ${err.message}`)
          });
        }
      }
    }

    this.toast.success('Avance registrado', `El avance para "${this.modalTitle()}" se ha guardado correctamente.`);
    this.closeModal();
  }

  onModalFileDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      this.processModalFiles(event.dataTransfer.files);
    }
  }

  onModalFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processModalFiles(input.files);
      input.value = '';
    }
  }

  private processModalFiles(files: FileList) {
    Array.from(files).forEach(f => {
      if (f.type !== 'application/pdf') return;
      if (f.size > 10 * 1024 * 1024) return;
      this.pendingFiles.update(prev => [...prev, { name: f.name, size: f.size, file: f }]);
    });
  }

  removePendingFile(name: string) {
    this.pendingFiles.update(prev => prev.filter(f => f.name !== name));
  }

  removeEvidencia(evidenciaId: number) {
    this.rtfService.removeEvidencia(evidenciaId).subscribe();
  }

  viewPdf(evidenciaId: number, filename: string) {
    this.pdfViewerFilename.set(filename);
    this.pdfViewerOpen.set(true);
    this.rtfService.downloadEvidencia(evidenciaId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        this.pdfViewerFileUrl.set(url);
        this.pdfViewerDownloadUrl.set(url);
      },
      error: () => {
        this.toast.error('Error', 'No se pudo cargar el PDF.');
        this.pdfViewerFileUrl.set(null);
        this.pdfViewerDownloadUrl.set(null);
      }
    });
  }

  onPdfViewerClose() {
    URL.revokeObjectURL(this.pdfViewerFileUrl() ?? '');
    this.pdfViewerOpen.set(false);
    this.pdfViewerFileUrl.set(null);
    this.pdfViewerDownloadUrl.set(null);
  }

  guardarBorrador() {
    this.isSaving.set(true);
    const rtfId = this.rtfService.rtfId();
    const r1Payload = {
      txtActividadesRealizadas: this.rtfService.txtActividadesRealizadas(),
      txtActividadesNoRealizadas: this.rtfService.txtActividadesNoRealizadas(),
      txtLogros: this.rtfService.txtLogros(),
      txtDificultades: this.rtfService.txtDificultades(),
      txtCambiosPaso: this.rtfService.txtCambiosPaso()
    };
    const afterR1 = () => {
      if (this.useBdSelMetas()) {
        this.isSaving.set(false);
        this.toast.success('Borrador guardado', 'El borrador del RTF se ha guardado correctamente.');
      } else {
        this.rtfService.updateMetas(rtfId!, this.rtfService.metas()).subscribe({
          next: () => {
            this.rtfService.updateIndicadores(rtfId!, this.rtfService.indicadores()).subscribe({
              next: () => {
                this.isSaving.set(false);
                this.toast.success('Borrador guardado', 'El borrador del RTF se ha guardado correctamente.');
              },
              error: () => { this.isSaving.set(false); this.toast.error('Error', 'No se pudo guardar el borrador.'); }
            });
          },
          error: () => { this.isSaving.set(false); this.toast.error('Error', 'No se pudo guardar el borrador.'); }
        });
      }
    };
    if (rtfId) {
      this.rtfService.updateRtf(rtfId, r1Payload).subscribe({
        next: () => afterR1(),
        error: () => { this.isSaving.set(false); this.toast.error('Error', 'No se pudo guardar el borrador.'); }
      });
    } else {
      this.rtfService.registrarRtf({
        ideConvenio: 0,
        numPasoCritico: this.rtfService.activePasoNumero(),
        fecInicioPeriodo: '',
        fecFinPeriodo: '',
        ...r1Payload
      }).subscribe({
        next: (nuevoRtf) => {
          if (nuevoRtf?.ideRtf) {
            this.rtfService.rtfId.set(nuevoRtf.ideRtf);
            afterR1();
          } else {
            this.isSaving.set(false);
            this.toast.error('Error', 'No se pudo crear el RTF.');
          }
        },
        error: () => { this.isSaving.set(false); this.toast.error('Error', 'No se pudo crear el RTF.'); }
      });
    }
  }

  enviarRtf() {
    if (!this.canSubmit()) return;
    this.isSubmitting.set(true);

    const rtfId = this.rtfService.rtfId();
    const r1Payload = {
      txtActividadesRealizadas: this.rtfService.txtActividadesRealizadas(),
      txtActividadesNoRealizadas: this.rtfService.txtActividadesNoRealizadas(),
      txtLogros: this.rtfService.txtLogros(),
      txtDificultades: this.rtfService.txtDificultades(),
      txtCambiosPaso: this.rtfService.txtCambiosPaso()
    };
    const afterR1 = () => {
      const afterIndicadores = () => {
        this.rtfService.enviarRtf(rtfId!).subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.toast.success('RTF enviado', 'El Reporte Técnico Financiero se ha guardado correctamente.');
            this.router.navigate(['/rtf/dashboard']);
          },
          error: () => {
            this.isSubmitting.set(false);
            this.toast.error('Error al enviar', 'No se pudo enviar el RTF. Intente nuevamente.');
          }
        });
      };
      if (this.useBdSelMetas()) {
        afterIndicadores();
      } else {
        this.rtfService.updateMetas(rtfId!, this.rtfService.metas()).subscribe({
          next: () => {
            this.rtfService.updateIndicadores(rtfId!, this.rtfService.indicadores()).subscribe({
              next: () => afterIndicadores(),
              error: () => { this.isSubmitting.set(false); this.toast.error('Error', 'No se pudo enviar el RTF.'); }
            });
          },
          error: () => { this.isSubmitting.set(false); this.toast.error('Error', 'No se pudo enviar el RTF.'); }
        });
      }
    };
    if (rtfId) {
      this.rtfService.updateRtf(rtfId, r1Payload).subscribe({
        next: () => afterR1(),
        error: () => { this.isSubmitting.set(false); this.toast.error('Error', 'No se pudo enviar el RTF.'); }
      });
    } else {
      this.rtfService.registrarRtf({
        ideConvenio: 0,
        numPasoCritico: this.rtfService.activePasoNumero(),
        fecInicioPeriodo: '',
        fecFinPeriodo: '',
        ...r1Payload
      }).subscribe({
        next: (nuevoRtf) => {
          if (nuevoRtf?.ideRtf) {
            this.rtfService.rtfId.set(nuevoRtf.ideRtf);
            afterR1();
          } else {
            this.isSubmitting.set(false);
            this.toast.error('Error', 'No se pudo crear el RTF.');
          }
        },
        error: () => { this.isSubmitting.set(false); this.toast.error('Error', 'No se pudo crear el RTF.'); }
      });
    }
  }

  sizeKB(size: number): number {
    return size > 0 ? Math.round(size / 1024) : 0;
  }
}
