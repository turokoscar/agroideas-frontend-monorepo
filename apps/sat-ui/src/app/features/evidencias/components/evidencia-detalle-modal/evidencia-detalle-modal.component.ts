import { ChangeDetectionStrategy, Component, EventEmitter, Output, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvidenciaListadoItem, EvidenciaService, EvidenciaValidacion } from '../../../../core/services/evidencia.service';
import { FormatDatePipe } from '@agroideas/utils';
import { UIButtonComponent } from '@agroideas/ui';

@Component({
  selector: 'app-evidencia-detalle-modal',
  standalone: true,
  imports: [CommonModule, FormatDatePipe, UIButtonComponent],
  template: `
    @if (ev()) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" (click)="cerrar.emit()">
        <div class="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between p-4 border-b border-slate-100">
            <h3 class="font-bold text-slate-800">Detalle de Evidencia</h3>
            <button (click)="cerrar.emit()" class="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="overflow-y-auto max-h-[calc(90vh-64px)]">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              <!-- Imagen -->
              <div class="space-y-4">
                <div class="aspect-square bg-slate-100 rounded-xl overflow-hidden">
                  <img [src]="getImageUrl(ev()!.ideEvidencia)" alt="Evidencia" 
                    class="w-full h-full object-contain"/>
                </div>
                <div class="flex gap-2">
                  <ui-button
                    label="Validar SHA-256"
                    icon="verified_user"
                    class="flex-1"
                    (onClick)="validar.emit()"
                  />
                  <a [href]="getImageUrl(ev()!.ideEvidencia)" target="_blank"
                    class="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2">
                    <span class="material-symbols-outlined text-sm">open_in_new</span>
                  </a>
                </div>
              </div>
              
              <!-- Metadatos -->
              <div class="space-y-4">
                <div class="bg-slate-50 rounded-xl p-4 space-y-3">
                  <h4 class="font-bold text-slate-700 text-sm">Datos de Captura</h4>
                  <div class="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span class="text-slate-500 text-xs">Asistente</span>
                      <p class="font-medium text-slate-700">{{ ev()?.txtAsistente }}</p>
                    </div>
                    <div>
                      <span class="text-slate-500 text-xs">Organización</span>
                      <p class="font-medium text-slate-700">{{ ev()?.txtOrganizacion }}</p>
                    </div>
                    <div>
                      <span class="text-slate-500 text-xs">Tipo Actividad</span>
                      <p class="font-medium text-slate-700">{{ ev()?.txtTipoActividad }}</p>
                    </div>
                    <div>
                      <span class="text-slate-500 text-xs">Fecha Captura</span>
                      <p class="font-medium text-slate-700">{{ ev()?.fecCaptura | formatDate: { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } }}</p>
                    </div>
                  </div>
                </div>

                <div class="bg-slate-50 rounded-xl p-4 space-y-3">
                  <h4 class="font-bold text-slate-700 text-sm">Ubicación GPS</h4>
                  <div class="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <span class="text-slate-500 text-xs">Latitud</span>
                      <p class="font-mono text-slate-700">{{ ev()?.numLatitud }}</p>
                    </div>
                    <div>
                      <span class="text-slate-500 text-xs">Longitud</span>
                      <p class="font-mono text-slate-700">{{ ev()?.numLongitud }}</p>
                    </div>
                    <div>
                      <span class="text-slate-500 text-xs">Precisión</span>
                      <p class="font-medium text-slate-700">{{ ev()?.numPrecision }}m</p>
                    </div>
                  </div>
                </div>

                <div class="bg-slate-50 rounded-xl p-4 space-y-3">
                  <h4 class="font-bold text-slate-700 text-sm">Hash SHA-256</h4>
                  <div class="space-y-2">
                    <div>
                      <span class="text-slate-500 text-xs">Hash Almacenado</span>
                      <p class="font-mono text-xs bg-white px-2 py-1.5 rounded border border-slate-200 break-all">{{ ev()?.txtHashSha256 || 'N/A' }}</p>
                    </div>
                    @if (val()) {
                      <div>
                        <span class="text-slate-500 text-xs">Hash Calculado</span>
                        <p class="font-mono text-xs bg-white px-2 py-1.5 rounded border break-all">{{ val()?.txtHashCalculado || 'No se pudo calcular' }}</p>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-lg" [class.text-emerald-600]="val()?.flgIntegro" [class.text-red-600]="!val()?.flgIntegro">
                          {{ val()?.flgIntegro ? 'verified' : 'error' }}
                        </span>
                        <span class="text-sm font-medium" [class.text-emerald-600]="val()?.flgIntegro" [class.text-red-600]="!val()?.flgIntegro">
                          {{ val()?.flgIntegro ? 'Integridad Verificada' : 'ALERTA: Archivo modificado o corrupto' }}
                        </span>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EvidenciaDetalleModalComponent {
  private evidenciaService = inject(EvidenciaService);

  ev = input<EvidenciaListadoItem | null>(null);
  val = input<EvidenciaValidacion | null>(null);

  @Output() cerrar = new EventEmitter<void>();
  @Output() validar = new EventEmitter<void>();

  getImageUrl(id: string): string {
    return this.evidenciaService.obtenerUrlArchivo(id);
  }
}
