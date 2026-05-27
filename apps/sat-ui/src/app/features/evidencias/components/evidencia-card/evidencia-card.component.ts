import { ChangeDetectionStrategy, Component, EventEmitter, Output, input, inject } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { EvidenciaListadoItem, EvidenciaService } from '../../../../core/services/evidencia.service';
import { FormatDatePipe } from '@agroideas/utils';

@Component({
  selector: 'app-evidencia-card',
  standalone: true,
  imports: [CommonModule, FormatDatePipe, NgOptimizedImage],
  template: `
    <div (click)="abrirDetalle.emit(ev())" 
      class="bg-white border border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg hover:border-indigo-200 transition-all group">
      <div class="aspect-square bg-slate-100 relative overflow-hidden">
        <img [ngSrc]="getImageUrl(ev().ideEvidencia)" fill alt="Evidencia" 
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          (error)="onImageError($event)"/>
        <div class="absolute top-2 right-2">
          @if (ev().txtHashSha256) {
            <span class="px-2 py-1 text-xs bg-emerald-500 text-white rounded-full font-medium">✓</span>
          }
        </div>
      </div>
      <div class="p-3 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs text-slate-500">{{ ev().txtAsistente }}</span>
        </div>
        <div class="text-xs text-slate-600 font-medium truncate">{{ ev().txtOrganizacion }}</div>
        <div class="text-xs text-slate-400">{{ ev().txtTipoActividad }}</div>
        <div class="flex items-center gap-2 text-xs text-slate-400">
          <span class="material-symbols-outlined text-xs">calendar_today</span>
          {{ ev().fecCaptura | formatDate: { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } }}
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EvidenciaCardComponent {
  private evidenciaService = inject(EvidenciaService);

  ev = input.required<EvidenciaListadoItem>();

  @Output() abrirDetalle = new EventEmitter<EvidenciaListadoItem>();

  getImageUrl(id: string): string {
    return this.evidenciaService.obtenerUrlArchivo(id);
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%2394a3b8" font-family="sans-serif" font-size="12">Sin imagen</text></svg>';
  }
}
