import { ChangeDetectionStrategy, Component, EventEmitter, Output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvidenciaListadoItem } from '../../../../core/services/evidencia.service';
import { FormatDatePipe } from '@agroideas/utils';
import { AuthImgDirective } from '../../../../core/directives/auth-img.directive';

@Component({
  selector: 'app-evidencia-card',
  standalone: true,
  imports: [CommonModule, FormatDatePipe, AuthImgDirective],
  template: `
    <div (click)="abrirDetalle.emit(ev())" 
      class="bg-white border border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg hover:border-primary transition-all group">
      <div class="aspect-square bg-slate-100 relative overflow-hidden">
        <img [authImg]="ev().ideEvidencia" alt="Evidencia" 
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          (error)="onImageError($event)"/>
        <div class="absolute top-2 right-2">
          @if (ev().txtHashSha256) {
            <span class="px-2 py-1 text-xs bg-emerald-500 text-white rounded-full font-medium">✓</span>
          }
        </div>
      </div>
      <div class="p-4 space-y-2.5">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-sm text-emerald-600">person</span>
          <span class="text-xs text-slate-500 font-medium">{{ ev().txtAsistente }}</span>
        </div>
        <div class="text-xs text-slate-700 font-semibold leading-snug">{{ ev().txtOrganizacion }}</div>
        <div class="text-xs text-slate-400 flex items-center gap-1.5">
          <span class="material-symbols-outlined text-xs">badge</span>
          {{ ev().txtTipoActividad }}
        </div>
        <div class="flex items-center gap-2 text-xs text-slate-400 pt-1 border-t border-slate-50">
          <span class="material-symbols-outlined text-xs">calendar_today</span>
          {{ ev().fecCaptura | formatDate: { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } }}
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EvidenciaCardComponent {
  ev = input.required<EvidenciaListadoItem>();

  @Output() abrirDetalle = new EventEmitter<EvidenciaListadoItem>();

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%2394a3b8" font-family="sans-serif" font-size="12">Sin imagen</text></svg>';
  }
}
