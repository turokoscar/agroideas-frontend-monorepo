import { Component, ElementRef, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { NotificacionService } from '../../core/services/notificacion.service';
import { NotificacionDto } from '../../core/models/notificacion.model';

/**
 * Campana de notificaciones in-app, con el mismo patrón que la de sigec-rtf: contador de no
 * leídas refrescado por polling y lista reciente al abrirla. Al pulsar una notificación se marca
 * como leída y se abre su expediente.
 */
@Component({
  selector: 'app-notificacion-bell',
  standalone: true,
  imports: [DatePipe, NgClass],
  template: `
    <div class="relative">
      <button
        type="button"
        class="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
        [attr.aria-label]="servicio.noLeidas() > 0 ? 'Notificaciones, ' + servicio.noLeidas() + ' sin leer' : 'Notificaciones'"
        aria-haspopup="true"
        [attr.aria-expanded]="abierto()"
        (click)="alternar()"
      >
        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">notifications</span>
        @if (servicio.noLeidas() > 0) {
          <span class="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground" aria-hidden="true">
            {{ servicio.noLeidas() > 9 ? '9+' : servicio.noLeidas() }}
          </span>
        }
      </button>

      @if (abierto()) {
        <div class="absolute right-0 z-50 mt-2 w-80 max-h-96 overflow-auto rounded-xl border border-border bg-background shadow-2xl">
          <div class="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 class="text-sm font-semibold text-foreground">Notificaciones</h3>
            @if (cargando()) {
              <span class="material-symbols-outlined text-[16px] text-muted-foreground animate-spin">progress_activity</span>
            }
          </div>

          @if (error()) {
            <p class="px-4 py-6 text-center text-xs text-destructive">No se pudieron cargar las notificaciones.</p>
          } @else if (!cargando() && servicio.notificaciones().length === 0) {
            <p class="px-4 py-6 text-center text-xs text-muted-foreground">Sin notificaciones.</p>
          }

          @for (n of servicio.notificaciones(); track n.ideNotificacion) {
            <button
              type="button"
              class="flex w-full flex-col gap-0.5 border-b border-border/50 px-4 py-3 text-left transition-colors hover:bg-muted/50"
              [ngClass]="{ 'bg-primary/5': !n.flgLeida }"
              (click)="abrir(n)"
            >
              <span class="flex items-center gap-1.5">
                @if (!n.flgLeida) {
                  <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"></span>
                }
                <span class="text-xs font-semibold text-foreground">{{ n.txtTitulo }}</span>
              </span>
              <span class="text-[11px] text-muted-foreground">{{ n.txtMensaje }}</span>
              <span class="text-[11px] text-muted-foreground/70">{{ n.fecRegistro | date: 'dd/MM/yyyy HH:mm' }}</span>
            </button>
          }
        </div>
      }
    </div>
  `
})
export class NotificacionBellComponent implements OnInit, OnDestroy {
  servicio = inject(NotificacionService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  abierto = signal(false);
  cargando = signal(false);
  error = signal(false);

  ngOnInit() {
    this.servicio.iniciarPolling();
  }

  ngOnDestroy() {
    this.servicio.detenerPolling();
  }

  alternar() {
    this.abierto.update(v => !v);
    if (this.abierto()) {
      this.cargando.set(true);
      this.error.set(false);
      this.servicio.listar().subscribe({
        next: () => this.cargando.set(false),
        error: () => {
          this.cargando.set(false);
          this.error.set(true);
        }
      });
    }
  }

  abrir(n: NotificacionDto) {
    if (!n.flgLeida) {
      this.servicio.marcarLeida(n.ideNotificacion).subscribe({ error: () => undefined });
    }
    this.abierto.set(false);
    this.router.navigate(['/expedientes', n.ideCierreConvenio]);
  }

  @HostListener('document:click', ['$event'])
  alHacerClicFuera(event: MouseEvent) {
    if (this.abierto() && !this.elementRef.nativeElement.contains(event.target)) {
      this.abierto.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  alPulsarEscape() {
    this.abierto.set(false);
  }
}
