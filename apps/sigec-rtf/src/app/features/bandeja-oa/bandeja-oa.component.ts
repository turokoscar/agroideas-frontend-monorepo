import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { RtfService, RtfCabeceraDto } from '../../core/services/rtf.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-bandeja-oa',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterModule],
  providers: [DatePipe],
  templateUrl: './bandeja-oa.component.html'
})
export class BandejaOAComponent implements OnInit, OnDestroy {
  rtfService = inject(RtfService);
  private router = inject(Router);
  private subs = new Subscription();

  tabs = [
    { key: 'PENDIENTE', label: 'Pendiente' },
    { key: 'EN_EDICION', label: 'En Edici\u00F3n' },
    { key: 'EN_REVISION', label: 'En Revisi\u00F3n' },
    { key: 'APROBADO', label: 'Aprobado' },
    { key: 'RECHAZADO', label: 'Rechazado' },
    { key: 'VENCIDO', label: 'Vencido' },
  ];

  loading = signal(false);

  activeTab = computed(() => this.rtfService.oaBandejaEstado());

  activeTabLabel = computed(() => {
    const tab = this.tabs.find(t => t.key === this.activeTab());
    return tab?.label ?? this.activeTab();
  });

  totalPages = computed(() => {
    const total = this.rtfService.oaBandejaTotal();
    return Math.max(1, Math.ceil(total / 10));
  });

  ngOnInit() {
    this.cargarBandeja();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  private cargarBandeja() {
    this.loading.set(true);
    this.subs.add(
      this.rtfService.loadBandejaOA(this.activeTab(), this.rtfService.oaBandejaPagina()).subscribe({
        next: () => this.loading.set(false),
        error: () => this.loading.set(false)
      })
    );
  }

  cambiarTab(estado: string) {
    this.rtfService.oaBandejaPagina.set(1);
    this.rtfService.oaBandejaEstado.set(estado);
    this.cargarBandeja();
  }

  irPagina(pagina: number) {
    this.rtfService.oaBandejaPagina.set(pagina);
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

  private navegarConRtf(rtf: RtfCabeceraDto, ruta: string) {
    if (!rtf.ideRtf) return;
    this.rtfService.rtfId.set(rtf.ideRtf);
    this.router.navigate([ruta]);
  }

  statusLabel(estado?: string): string {
    const map: Record<string, string> = {
      'PENDIENTE': 'Pendiente',
      'EN_EDICION': 'En Edici\u00F3n',
      'EN_REVISION': 'En Revisi\u00F3n',
      'APROBADO': 'Aprobado',
      'RECHAZADO': 'Rechazado',
      'VENCIDO': 'Vencido',
      'AUDITADO_CAMPO': 'Auditado Campo',
      'IN_REVISION_UN': 'En Gabinete',
    };
    return map[estado ?? ''] ?? estado ?? '';
  }

  estadoBadgeClass(estado?: string): string {
    switch (estado) {
      case 'APROBADO': return 'bg-success-soft border border-success/20 text-success';
      case 'RECHAZADO': return 'bg-destructive/10 border border-destructive/20 text-destructive';
      case 'VENCIDO': return 'bg-destructive/10 border border-destructive/20 text-destructive';
      case 'EN_EDICION': return 'bg-amber-500/10 border border-amber-500/20 text-amber-600';
      case 'PENDIENTE': return 'bg-amber-500/10 border border-amber-500/20 text-amber-600';
      case 'EN_REVISION': return 'bg-info/10 border border-info/20 text-info';
      case 'AUDITADO_CAMPO': return 'bg-info/10 border border-info/20 text-info';
      case 'IN_REVISION_UN': return 'bg-primary/10 border border-primary/20 text-primary';
      default: return 'bg-surface-container border border-border text-muted-foreground';
    }
  }
}
