import { Component, ElementRef, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NotificacionService } from '../../core/services/notificacion.service';
import { NotificacionDto } from '../../core/models';

/**
 * Campana de notificaciones in-app (Fase 6): badge con el conteo de no leídas (refrescado por
 * polling cada 60s vía NotificacionService) y dropdown con el feed reciente al hacer clic.
 * Cubre en un solo componente lo que el plan describía como NotificacionBadge + NotificacionDropdown.
 */
@Component({
  selector: 'app-notificacion-bell',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="relative">
      <button
        type="button"
        class="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
        [attr.aria-label]="notificacionService.noLeidas() > 0 ? 'Notificaciones, ' + notificacionService.noLeidas() + ' sin leer' : 'Notificaciones'"
        aria-haspopup="true"
        [attr.aria-expanded]="open()"
        (click)="toggleOpen()"
      >
        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">notifications</span>
        @if (notificacionService.noLeidas() > 0) {
          <span class="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground" aria-hidden="true">
            {{ notificacionService.noLeidas() > 9 ? '9+' : notificacionService.noLeidas() }}
          </span>
        }
      </button>

      @if (open()) {
        <div class="absolute right-0 z-50 mt-2 w-80 max-h-96 overflow-auto rounded-xl border border-border bg-background shadow-2xl">
          <div class="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 class="text-sm font-semibold text-foreground">Notificaciones</h3>
            @if (cargando()) {
              <span class="material-symbols-outlined text-[16px] text-muted-foreground animate-spin">progress_activity</span>
            }
          </div>

          @if (!cargando() && notificacionService.notificaciones().length === 0) {
            <p class="px-4 py-6 text-center text-xs text-muted-foreground">Sin notificaciones.</p>
          }

          @for (n of notificacionService.notificaciones(); track n.ideNotificacion) {
            <button
              type="button"
              class="flex w-full flex-col gap-0.5 border-b border-border/50 px-4 py-3 text-left transition-colors hover:bg-muted/50"
              [class.bg-primary]="!n.estLeida"
              [class.bg-opacity-5]="!n.estLeida"
              (click)="onNotificacionClick(n)"
            >
              <div class="flex items-center gap-1.5">
                @if (!n.estLeida) {
                  <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"></span>
                }
                <span class="text-xs font-semibold text-foreground">{{ n.txtTitulo }}</span>
              </div>
              <p class="text-[11px] text-muted-foreground">{{ n.txtMensaje }}</p>
              <span class="text-[10px] text-muted-foreground/70">{{ n.fecRegistro | date:'dd/MM/yyyy HH:mm' }}</span>
            </button>
          }
        </div>
      }
    </div>
  `
})
export class NotificacionBellComponent implements OnInit, OnDestroy {
  notificacionService = inject(NotificacionService);
  private elementRef = inject(ElementRef);

  open = signal(false);
  cargando = signal(false);

  ngOnInit() {
    this.notificacionService.iniciarPolling();
  }

  ngOnDestroy() {
    this.notificacionService.detenerPolling();
  }

  toggleOpen() {
    this.open.update(v => !v);
    if (this.open()) {
      this.cargando.set(true);
      this.notificacionService.cargarNotificaciones().subscribe({
        complete: () => this.cargando.set(false)
      });
    }
  }

  onNotificacionClick(n: NotificacionDto) {
    if (!n.estLeida) {
      this.notificacionService.marcarLeida(n.ideNotificacion).subscribe();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.open() && !this.elementRef.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.open.set(false);
  }
}
