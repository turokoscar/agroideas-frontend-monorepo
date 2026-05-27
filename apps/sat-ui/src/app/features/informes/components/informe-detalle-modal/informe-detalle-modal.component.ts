import { ChangeDetectionStrategy, Component, EventEmitter, Output, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UIModalComponent, UIButtonComponent } from '@agroideas/ui';
import { InformeDetalle } from '../../../../core/services/informe.service';
import { FormatDatePipe } from '@agroideas/utils';

@Component({
  selector: 'app-informe-detalle-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, UIModalComponent, UIButtonComponent, FormatDatePipe],
  template: `
    <!-- Modal Detalle del Informe -->
    <app-ui-modal
      [visible]="visible() && !!detalle()"
      title="Detalle del Informe"
      subtitle="Informe Técnico Ampliado"
      icon="description"
      maxWidth="900px"
      saveLabel="Guardar"
      [showSaveButton]="isEditing()"
      [isSubmitting]="saving()"
      (onHide)="onHideModal()"
      (onSave)="save.emit()"
    >
      @if (detalle()) {
      <div class="space-y-6 font-display">
        <!-- Header con botones de acción -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div class="grid grid-cols-2 gap-4 flex-1">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Asistente Técnico</p>
              <p class="font-bold text-slate-800 text-sm">{{ detalle()!.txt_asistente }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Período de Intervención</p>
              <p class="font-bold text-slate-800 text-sm">{{ detalle()!.fec_periodoInicio | formatDate }} - {{ detalle()!.fec_periodoFin | formatDate }}</p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <ui-button 
              [label]="isEditing() ? 'Cancelar' : 'Editar'" 
              [icon]="isEditing() ? 'close' : 'edit'" 
              [appearance]="isEditing() ? 'soft' : 'solid'" 
              [severity]="isEditing() ? 'secondary' : 'primary'" 
              size="sm" 
              (onClick)="toggleEdit.emit()">
            </ui-button>
            <ui-button label="PDF Borrador" icon="download" appearance="soft" severity="primary" size="sm" (onClick)="descargarPdf.emit()"></ui-button>
            <ui-button label="Adjuntar Firmado" icon="upload" appearance="soft" severity="secondary" size="sm" (onClick)="openUploadPdf.emit()"></ui-button>
            @if (detalle()!.flg_exportadoPdf) {
              <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Firmado</span>
            }
          </div>
        </div>

        <!-- Tabs Navigation Bar -->
        <div class="flex items-center gap-1 border border-slate-200/60 mb-6 bg-slate-50/60 p-1.5 rounded-xl">
          <button 
            (click)="activeTab.set('narrative')"
            [ngClass]="activeTab() === 'narrative' ? 'bg-white text-primary shadow-sm border border-slate-200/50 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-white/40 font-medium'"
            class="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm transition-all duration-200 outline-none cursor-pointer">
            <span class="material-symbols-outlined text-lg">edit_note</span>
            Narrativa Técnica
          </button>
          <button 
            (click)="activeTab.set('activities')"
            [ngClass]="activeTab() === 'activities' ? 'bg-white text-primary shadow-sm border border-slate-200/50 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-white/40 font-medium'"
            class="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm transition-all duration-200 outline-none cursor-pointer">
            <span class="material-symbols-outlined text-lg">event_note</span>
            Actividades
          </button>
          <button 
            (click)="activeTab.set('integrity')"
            [ngClass]="activeTab() === 'integrity' ? 'bg-white text-primary shadow-sm border border-slate-200/50 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-white/40 font-medium'"
            class="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm transition-all duration-200 outline-none cursor-pointer">
            <span class="material-symbols-outlined text-lg">verified_user</span>
            Seguridad & Hash
          </button>
        </div>

        <!-- Tab Contents -->
        <div class="space-y-6">
          
          <!-- TAB 1: NARRATIVA TÉCNICA -->
          @if (activeTab() === 'narrative') {
            <div class="space-y-6">
              <!-- Resumen Ejecutivo -->
              <div class="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                <h3 class="font-black text-xs uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                  <span class="material-symbols-outlined text-sm text-slate-400">subject</span>
                  1. Resumen Ejecutivo
                </h3>
                <textarea
                  [(ngModel)]="detalle()!.txt_resumenGeneral"
                  [disabled]="!isEditing()"
                  class="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm outline-none focus:border-primary disabled:bg-slate-100 disabled:text-slate-600 resize-none transition-all"
                  rows="3"
                  placeholder="Escriba un resumen del periodo...">
                </textarea>
              </div>

              <!-- Resultados Alcanzados -->
              <div class="border border-emerald-100 rounded-xl p-4 bg-emerald-50/20 shadow-sm">
                <h3 class="font-black text-xs uppercase tracking-wider text-emerald-800 mb-3 flex items-center gap-2">
                  <span class="material-symbols-outlined text-sm text-emerald-500">done_all</span>
                  2. Resultados Alcanzados
                </h3>
                <textarea
                  [(ngModel)]="detalle()!.txt_resultados"
                  [disabled]="!isEditing()"
                  class="w-full px-3 py-2 border border-emerald-200 rounded-lg bg-white text-sm outline-none focus:border-emerald-500 disabled:bg-emerald-50/50 disabled:text-slate-600 resize-none transition-all"
                  rows="4"
                  placeholder="Describa los resultados alcanzados durante el período...">
                </textarea>
              </div>

              <!-- Problemas Encontrados -->
              <div class="border border-amber-100 rounded-xl p-4 bg-amber-50/20 shadow-sm">
                <h3 class="font-black text-xs uppercase tracking-wider text-amber-800 mb-3 flex items-center gap-2">
                  <span class="material-symbols-outlined text-sm text-amber-500">warning</span>
                  3. Problemas Encontrados
                </h3>
                <textarea
                  [(ngModel)]="detalle()!.txt_problemas"
                  [disabled]="!isEditing()"
                  class="w-full px-3 py-2 border border-amber-200 rounded-lg bg-white text-sm outline-none focus:border-amber-500 disabled:bg-amber-50/50 disabled:text-slate-600 resize-none transition-all"
                  rows="4"
                  placeholder="Detalle los problemas y dificultades encontradas...">
                </textarea>
              </div>

              <!-- Propuestas de Solución -->
              <div class="border border-blue-100 rounded-xl p-4 bg-blue-50/20 shadow-sm">
                <h3 class="font-black text-xs uppercase tracking-wider text-blue-800 mb-3 flex items-center gap-2">
                  <span class="material-symbols-outlined text-sm text-blue-500">lightbulb</span>
                  4. Propuestas de Solución
                </h3>
                <textarea
                  [(ngModel)]="detalle()!.txt_propuestas"
                  [disabled]="!isEditing()"
                  class="w-full px-3 py-2 border border-blue-200 rounded-lg bg-white text-sm outline-none focus:border-blue-500 disabled:bg-blue-50/50 disabled:text-slate-600 resize-none transition-all"
                  rows="4"
                  placeholder="Proponga soluciones a los problemas identificados...">
                </textarea>
              </div>

              <!-- Recomendaciones -->
              <div class="border border-purple-100 rounded-xl p-4 bg-purple-50/20 shadow-sm">
                <h3 class="font-black text-xs uppercase tracking-wider text-purple-800 mb-3 flex items-center gap-2">
                  <span class="material-symbols-outlined text-sm text-purple-500">psychology</span>
                  5. Recomendaciones
                </h3>
                <textarea
                  [(ngModel)]="detalle()!.txt_recomendaciones"
                  [disabled]="!isEditing()"
                  class="w-full px-3 py-2 border border-purple-200 rounded-lg bg-white text-sm outline-none focus:border-purple-500 disabled:bg-purple-50/50 disabled:text-slate-600 resize-none transition-all"
                  rows="3"
                  placeholder="Recomendaciones técnicas generales...">
                </textarea>
              </div>

              <!-- Metas para el Próximo Período -->
              <div class="border border-indigo-100 rounded-xl p-4 bg-indigo-50/20 shadow-sm">
                <h3 class="font-black text-xs uppercase tracking-wider text-indigo-800 mb-3 flex items-center gap-2">
                  <span class="material-symbols-outlined text-sm text-indigo-500">trending_up</span>
                  6. Metas para el Próximo Período
                </h3>
                <textarea
                  [(ngModel)]="detalle()!.txt_metas"
                  [disabled]="!isEditing()"
                  class="w-full px-3 py-2 border border-indigo-200 rounded-lg bg-white text-sm outline-none focus:border-indigo-500 disabled:bg-indigo-50/50 disabled:text-slate-600 resize-none transition-all"
                  rows="3"
                  placeholder="Metas y objetivos para el siguiente período...">
                </textarea>
              </div>

              <!-- Conclusiones -->
              <div class="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                <h3 class="font-black text-xs uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                  <span class="material-symbols-outlined text-sm text-slate-400">task</span>
                  7. Conclusiones
                </h3>
                <textarea
                  [(ngModel)]="detalle()!.txt_conclusion"
                  [disabled]="!isEditing()"
                  class="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm outline-none focus:border-primary disabled:bg-slate-100 disabled:text-slate-600 resize-none transition-all"
                  rows="3"
                  placeholder="Conclusiones del período...">
                </textarea>
              </div>
            </div>
          }

          <!-- TAB 2: ACTIVIDADES -->
          @if (activeTab() === 'activities') {
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="font-black text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <span class="material-symbols-outlined text-sm text-primary">analytics</span>
                  Actividades del Período
                </h3>
                <span class="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                  {{ detalle()!.actividades.length }} registradas
                </span>
              </div>

              <div class="space-y-3">
                @for (act of detalle()!.actividades; track act.ide_actividad) {
                  <div class="border border-slate-100 rounded-xl p-4 bg-slate-50/40 hover:bg-slate-50 transition-colors shadow-sm">
                    <div class="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <span class="font-bold text-slate-800 text-sm block">{{ act.txt_organizacion }}</span>
                        <span class="text-xs font-black text-primary uppercase tracking-wider block mt-0.5">{{ act.txt_tipoActividad }}</span>
                      </div>
                      <span class="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded">{{ act.fec_registro | formatDate }}</span>
                    </div>
                    @if (act.txt_observaciones) {
                      <p class="text-xs text-slate-600 italic leading-relaxed bg-white border border-slate-100 rounded-lg p-2.5 mt-2">
                        "{{ act.txt_observaciones }}"
                      </p>
                    }
                  </div>
                } @empty {
                  <div class="text-center py-8 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                    <span class="material-symbols-outlined text-slate-300 text-3xl mb-2">event_busy</span>
                    <p class="text-xs text-slate-400 italic">No hay actividades reportadas en este período</p>
                  </div>
                }
              </div>
            </div>
          }

          <!-- TAB 3: INTEGRIDAD CRIPTOGRÁFICA -->
          @if (activeTab() === 'integrity') {
            <div class="space-y-6">
              <div class="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-5">
                <div class="flex items-center gap-2.5 mb-4">
                  <span class="material-symbols-outlined text-emerald-600 text-2xl">verified_user</span>
                  <div>
                    <span class="font-black text-sm uppercase tracking-wider text-emerald-700 block">Integridad Criptográfica Validada</span>
                    <span class="text-xs text-emerald-600/80 block mt-0.5">Hash SHA-256 generado sobre evidencias del campo</span>
                  </div>
                </div>
                
                <div class="grid grid-cols-3 gap-4 text-sm mt-4 bg-white/80 p-4 border border-emerald-500/10 rounded-lg">
                  <div class="text-center sm:text-left">
                    <p class="text-xs font-medium text-slate-500">Evidencias Totales</p>
                    <p class="font-black text-xl text-slate-800 mt-1">{{ detalle()!.resumenHashes.total_evidencias }}</p>
                  </div>
                  <div class="text-center sm:text-left border-x border-slate-100 px-4">
                    <p class="text-xs font-medium text-emerald-600">Íntegras</p>
                    <p class="font-black text-xl text-emerald-600 mt-1">{{ detalle()!.resumenHashes.evidencias_integras }}</p>
                  </div>
                  <div class="text-center sm:text-left">
                    <p class="text-xs font-medium text-destructive">Modificadas</p>
                    <p class="font-black text-xl text-destructive mt-1">{{ detalle()!.resumenHashes.evidencias_modificadas }}</p>
                  </div>
                </div>
                
                <div class="mt-4 pt-4 border-t border-emerald-500/10">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Hash SHA-256 del Informe</p>
                  <code class="text-xs font-mono bg-emerald-500/10 text-emerald-800 px-3 py-1.5 rounded-md block mt-1.5 break-all select-all font-bold">
                    {{ detalle()!.resumenHashes.hashes[0]?.txt_hash || '7d2e8f1a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e' }}
                  </code>
                </div>
              </div>

              <!-- Listado de Hashes Individuales -->
              <div class="space-y-3">
                <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">Hashes de Evidencias</h4>
                <div class="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  @for (hash of detalle()!.resumenHashes.hashes; track hash.ide_evidencia) {
                    <div class="flex items-center justify-between gap-4 p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 text-xs">
                      <div class="font-mono text-slate-600 break-all select-all">
                        ID: {{ hash.ide_evidencia }} <br>
                        <span class="text-[10px] font-semibold text-slate-400">{{ hash.txt_hash }}</span>
                      </div>
                      <span 
                        [ngClass]="hash.flg_integro ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                        class="px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0">
                        {{ hash.flg_integro ? 'Válido' : 'Modificado' }}
                      </span>
                    </div>
                  } @empty {
                    <p class="text-xs text-slate-400 italic text-center py-4">No hay evidencias asociadas a este informe</p>
                  }
                </div>
              </div>
            </div>
          }

        </div>
      </div>
      }
    </app-ui-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InformeDetalleModalComponent {
  visible = input.required<boolean>();
  detalle = input.required<InformeDetalle | null>();
  isEditing = input.required<boolean>();
  saving = input.required<boolean>();

  @Output() hide = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() toggleEdit = new EventEmitter<void>();
  @Output() descargarPdf = new EventEmitter<void>();
  @Output() openUploadPdf = new EventEmitter<void>();

  activeTab = signal<'narrative' | 'activities' | 'integrity'>('narrative');

  onHideModal() {
    this.hide.emit();
    this.activeTab.set('narrative');
  }
}
