import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RtfService } from '../../core/services/rtf.service';
import { AuthService } from '../../core/services/auth.service';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-oa-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterModule],
  providers: [DecimalPipe],
  templateUrl: './oa-dashboard.component.html'
})
export class OaDashboardComponent implements OnInit {
  rtfService = inject(RtfService);
  authService = inject(AuthService);

  isLoading = signal(true);
  hasError = signal(false);

  activePasoCriticoId = computed(() => {
    const pasos = this.rtfService.pasos();
    const active = pasos.find(p => p.status === 'Activo') || pasos[0];
    return active?.id ?? this.rtfService.activePasoNumero();
  });

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.isLoading.set(true);
    this.hasError.set(false);

    const usuarioId = Number(this.authService.user()?.id);
    if (!usuarioId) {
      this.hasError.set(true);
      this.isLoading.set(false);
      return;
    }

    this.rtfService.resolvePostulanteId().pipe(
      switchMap(postulanteId => this.rtfService.loadDashboard(postulanteId)),
      switchMap(() => this.rtfService.loadActividadReciente())
    ).subscribe({
      next: () => this.isLoading.set(false),
      error: () => {
        this.isLoading.set(false);
        this.hasError.set(true);
      }
    });
  }

  get financialProgress(): number {
    const budget = this.rtfService.budget();
    if (budget <= 0) return 0;
    return Math.round((this.rtfService.disbursed() / budget) * 100);
  }

  get currentMonthPct(): number {
    return (this.rtfService.currentMonth() / this.rtfService.durationMonths()) * 100;
  }

  get monthLabels(): number[] {
    const total = this.rtfService.durationMonths();
    const step = Math.max(1, Math.floor(total / 12));
    const labels: number[] = [];
    for (let i = 1; i <= total; i += step) {
      labels.push(i);
    }
    if (labels[labels.length - 1] !== total) {
      labels.push(total);
    }
    return labels;
  }

  statusLabel(): string {
    const status = this.rtfService.rtfStatus();
    switch (status) {
      case 'PENDIENTE': return 'En Edición';
      case 'ENVIADO': return 'Enviado a UR';
      case 'EN_REVISION': return 'En Revisión';
      case 'APROBADO': return 'Aprobado';
      case 'RECHAZADO': return 'Rechazado';
      case 'VENCIDO': return 'Vencido';
      case 'OBSERVADO': return 'Con Observaciones';
      default: return status;
    }
  }

  pasoClass(status: string): string {
    switch (status) {
      case 'Aprobado':
      case 'Validado':
        return 'bg-success text-success-foreground';
      case 'Activo':
        return 'bg-primary text-primary-foreground';
      default:
        return 'bg-surface-container text-muted-foreground';
    }
  }

  pasoBadgeClass(status: string): string {
    switch (status) {
      case 'Aprobado':
      case 'Validado':
        return 'bg-success-soft border-success/20 text-success';
      case 'Activo':
        return 'bg-primary-soft border-primary/20 text-primary';
      default:
        return 'bg-surface-container border-border text-muted-foreground';
    }
  }

  actividadIconClass(tipo: string): string {
    switch (tipo) {
      case 'aprobado': return 'text-success';
      case 'desembolso': return 'text-primary';
      case 'edicion': return 'text-amber-500';
      case 'observacion': return 'text-warning';
      case 'envio': return 'text-info';
      case 'vencido': return 'text-destructive';
      case 'alerta': return 'text-amber-500';
      default: return 'text-muted-foreground';
    }
  }
}
