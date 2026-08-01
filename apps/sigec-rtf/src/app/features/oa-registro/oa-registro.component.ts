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
  template: `
    <div class="space-y-6 animate-fade-in">

      <!-- Countdown Banner -->
      <ui-countdown-banner
        [hours]="rtfService.rtfDeadlineHours()"
        [tone]="'warning'"
        [label]="'Plazo para envío del RTF'"
      />

      <!-- Header Info Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-surface-container-lowest border border-border rounded-xl p-4 space-y-1">
          <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Convenio</span>
          <p class="text-sm font-bold text-foreground">{{ rtfService.convenioId() }}</p>
        </div>
        <div class="bg-surface-container-lowest border border-border rounded-xl p-4 space-y-1">
          <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Paso Crítico</span>
          <p class="text-sm font-bold text-primary">{{ rtfService.activePasoNumero() }} / {{ rtfService.totalPasos() }}</p>
        </div>
        <div class="bg-surface-container-lowest border border-border rounded-xl p-4 space-y-1">
          <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Período</span>
          <p class="text-sm font-bold text-foreground">Mes {{ rtfService.currentMonth() }} / {{ rtfService.durationMonths() }}</p>
        </div>
        <div class="bg-surface-container-lowest border border-border rounded-xl p-4 space-y-1">
          <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Estado</span>
          <p class="text-sm font-bold" [class.text-amber-500]="rtfService.rtfStatus() === 'PENDIENTE' || rtfService.rtfStatus() === 'EN_EDICION'" [class.text-success]="rtfService.rtfStatus() === 'APROBADO'">
            {{ rtfService.rtfStatusLabel() }}
          </p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bg-surface-container-lowest border border-border rounded-xl overflow-hidden shadow-sm">
        <!-- Tab Navigation -->
        <div class="flex border-b border-border bg-muted/20">
          @for (tab of tabs; track tab.key) {
            <button
              class="relative px-6 py-3 text-sm font-medium transition-all"
              [class.text-primary]="activeTab() === tab.key"
              [class.text-muted-foreground]="activeTab() !== tab.key"
              (click)="activeTab.set(tab.key)"
            >
              <span>{{ tab.label }}</span>
              @if (activeTab() === tab.key) {
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></div>
              }
            </button>
          }
        </div>

        <!-- Tab Content -->
        <div class="p-6">

          <!-- R1 - Información Cualitativa -->
          @if (activeTab() === 'R1') {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full animate-fade-in">
              
              <!-- Actividades Realizadas -->
              <div class="bg-surface-container-lowest border border-border rounded-2xl p-5 space-y-3 shadow-sm hover:border-primary/20 transition-all">
                <div class="flex items-center gap-2.5">
                  <span class="material-symbols-outlined text-success text-[24px]">task_alt</span>
                  <label class="text-sm font-bold text-foreground">¿Qué actividades SÍ logró realizar?</label>
                </div>
                <p class="text-xs text-muted-foreground">Describa brevemente las labores, compras o tareas que se completaron con éxito.</p>
                <textarea
                  class="w-full rounded-xl border border-border bg-surface-container/10 px-4 py-3 text-sm resize-y min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="Ej. Se compraron 50 sacos de abono orgánico y se instaló el sistema de riego por goteo en la parcela principal..."
                  [(ngModel)]="rtfService.txtActividadesRealizadas"
                ></textarea>
              </div>

              <!-- Actividades No Realizadas -->
              <div class="bg-surface-container-lowest border border-border rounded-2xl p-5 space-y-3 shadow-sm hover:border-primary/20 transition-all">
                <div class="flex items-center gap-2.5">
                  <span class="material-symbols-outlined text-warning text-[24px]">pending_actions</span>
                  <label class="text-sm font-bold text-foreground">¿Qué actividades NO se pudieron hacer?</label>
                </div>
                <p class="text-xs text-muted-foreground">Indique qué tareas estaban planificadas pero tuvieron que posponerse o cancelarse.</p>
                <textarea
                  class="w-full rounded-xl border border-border bg-surface-container/10 px-4 py-3 text-sm resize-y min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="Ej. No se pudo construir el cobertizo debido al retraso en la entrega de maderas por el proveedor..."
                  [(ngModel)]="rtfService.txtActividadesNoRealizadas"
                ></textarea>
              </div>

              <!-- Logros Alcanzados -->
              <div class="bg-surface-container-lowest border border-border rounded-2xl p-5 space-y-3 shadow-sm hover:border-primary/20 transition-all">
                <div class="flex items-center gap-2.5">
                  <span class="material-symbols-outlined text-info text-[24px]">workspace_premium</span>
                  <label class="text-sm font-bold text-foreground">¿Qué logros u objetivos consiguió?</label>
                </div>
                <p class="text-xs text-muted-foreground">Escriba los resultados positivos, producción cosechada o mejoras obtenidas en este período.</p>
                <textarea
                  class="w-full rounded-xl border border-border bg-surface-container/10 px-4 py-3 text-sm resize-y min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="Ej. Se logró mejorar la humedad de la tierra y cosechamos las primeras 2 toneladas de papa de calidad A..."
                  [(ngModel)]="rtfService.txtLogros"
                ></textarea>
              </div>

              <!-- Dificultades / Problemas -->
              <div class="bg-surface-container-lowest border border-border rounded-2xl p-5 space-y-3 shadow-sm hover:border-primary/20 transition-all">
                <div class="flex items-center gap-2.5">
                  <span class="material-symbols-outlined text-error text-[24px]">warning_amber</span>
                  <label class="text-sm font-bold text-foreground">¿Tuvo alguna dificultad o problema?</label>
                </div>
                <p class="text-xs text-muted-foreground">Mencione si hubo problemas con el clima, plagas, caídas de precios, transporte o falta de agua.</p>
                <textarea
                  class="w-full rounded-xl border border-border bg-surface-container/10 px-4 py-3 text-sm resize-y min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="Ej. Tuvimos problemas por exceso de lluvias durante la primera semana, lo cual dificultó el ingreso del camión..."
                  [(ngModel)]="rtfService.txtDificultades"
                ></textarea>
              </div>

              <!-- Cambios respecto al Plan -->
              <div class="bg-surface-container-lowest border border-border rounded-2xl p-5 space-y-3 shadow-sm hover:border-primary/20 transition-all md:col-span-2">
                <div class="flex items-center gap-2.5">
                  <span class="material-symbols-outlined text-primary text-[24px]">published_with_changes</span>
                  <label class="text-sm font-bold text-foreground">¿Hizo algún cambio respecto al plan original?</label>
                </div>
                <p class="text-xs text-muted-foreground">Explique si tuvo que cambiar de proveedor, modificar fechas de siembra o ajustar los insumos planificados.</p>
                <textarea
                  class="w-full rounded-xl border border-border bg-surface-container/10 px-4 py-3 text-sm resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="Ej. Se cambió de marca de abono foliar por sugerencia del técnico y se reprogramaron los talleres grupales..."
                  [(ngModel)]="rtfService.txtCambiosPaso"
                ></textarea>
              </div>

            </div>
          }

          <!-- T1 - Metas Físicas (legacy + BD_SEL ADR-002) -->
          @if (activeTab() === 'T1') {
            <div class="space-y-4 animate-fade-in">
              <!-- Banner informativo amigable sobre auto-población contable -->
              <div class="flex items-start gap-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm">
                <span class="text-xl">🚜</span>
                <div class="space-y-1">
                  <p class="font-bold text-sm">¡Hola!</p>
                  <p>Hemos registrado automáticamente tus avances de compras y comprobantes ingresados al sistema. Revisa abajo y presiona el botón <strong>Anotar Avance</strong> (lápiz) si necesitas corregir o subir documentos de sustento.</p>
                </div>
              </div>

              @if (useBdSelMetas()) {
                <!-- Vista Escritorio -->
                <div class="hidden md:block">
                  <app-ui-data-table
                    [columns]="metasSelColumns"
                    [data]="filteredPasoCriticoMetas()"
                    [paginator]="true"
                    [rows]="10"
                    [showIndex]="true"
                    [hasActions]="true"
                    [actionsTemplate]="metasActionsTpl"
                    [rowTemplate]="metasSelRowTpl"
                    emptyMessage="No hay metas programadas para este paso crítico."
                  />
                </div>

                <!-- Vista Móvil en Tarjetas -->
                <div class="grid grid-cols-1 gap-4 md:hidden">
                  @for (meta of filteredPasoCriticoMetas(); track meta.id) {
                    <div class="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm hover:border-primary/30 transition-all">
                      <div class="flex justify-between items-start gap-3">
                        <div class="space-y-1">
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">
                            🌱 Actividad
                          </span>
                          <h3 class="text-sm font-bold text-foreground">{{ meta.descripcion }}</h3>
                        </div>
                        <button
                          class="inline-flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20 p-2 text-primary hover:bg-primary hover:text-primary-foreground transition-all shrink-0"
                          (click)="openModal('meta', meta)"
                          title="Anotar avance"
                        >
                          <span class="material-symbols-outlined text-[20px]">edit_note</span>
                        </button>
                      </div>

                      <div class="grid grid-cols-3 gap-2 bg-muted/20 rounded-xl p-3 text-center">
                        <div class="space-y-0.5">
                          <span class="text-[9px] uppercase font-bold text-muted-foreground block">Planificado</span>
                          <span class="text-xs font-bold text-foreground">{{ meta.metaFisicaProgramada }} <span class="text-[10px] text-muted-foreground font-normal">{{ meta.unidadMedida }}</span></span>
                        </div>
                        <div class="space-y-0.5">
                          <span class="text-[9px] uppercase font-bold text-muted-foreground block">Logrado</span>
                          <span class="text-xs font-bold text-foreground">{{ meta.metaFisicaEjecutada || 0 }} <span class="text-[10px] text-muted-foreground font-normal">{{ meta.unidadMedida }}</span></span>
                        </div>
                        <div class="space-y-0.5">
                          <span class="text-[9px] uppercase font-bold text-muted-foreground block">Avance</span>
                          <span class="text-xs font-bold" [class.text-success]="(meta.metaFisicaEjecutada / meta.metaFisicaProgramada) >= 1" [class.text-warning]="(meta.metaFisicaEjecutada / meta.metaFisicaProgramada) < 1">
                            {{ (meta.metaFisicaProgramada > 0 ? (meta.metaFisicaEjecutada / meta.metaFisicaProgramada) : 0) | percent:'1.0-0' }}
                          </span>
                        </div>
                      </div>
                    </div>
                  }
                  @if (filteredPasoCriticoMetas().length === 0) {
                    <p class="text-center text-xs text-muted-foreground py-6">No hay metas programadas para este paso crítico.</p>
                  }
                </div>

              } @else {
                <!-- Legacy Vista Escritorio -->
                <div class="hidden md:block">
                  <app-ui-data-table
                    [columns]="metasLegacyColumns"
                    [data]="filteredLegacyMetas()"
                    [paginator]="true"
                    [rows]="10"
                    [showIndex]="true"
                    [hasActions]="true"
                    [actionsTemplate]="metasActionsTpl"
                    [rowTemplate]="metasLegacyRowTpl"
                    emptyMessage="No hay metas físicas registradas."
                  />
                </div>

                <!-- Legacy Vista Móvil -->
                <div class="grid grid-cols-1 gap-4 md:hidden">
                  @for (meta of filteredLegacyMetas(); track meta.ideMetaFisica) {
                    <div class="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm hover:border-primary/30 transition-all">
                      <div class="flex justify-between items-start gap-3">
                        <div class="space-y-1">
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">
                            🌾 Meta
                          </span>
                          <h3 class="text-sm font-bold text-foreground">{{ meta.actividad }}</h3>
                        </div>
                        <button
                          class="inline-flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20 p-2 text-primary hover:bg-primary hover:text-primary-foreground transition-all shrink-0"
                          (click)="openModal('meta', meta)"
                        >
                          <span class="material-symbols-outlined text-[20px]">edit_note</span>
                        </button>
                      </div>

                      <div class="grid grid-cols-3 gap-2 bg-muted/20 rounded-xl p-3 text-center">
                        <div class="space-y-0.5">
                          <span class="text-[9px] uppercase font-bold text-muted-foreground block">Planificado</span>
                          <span class="text-xs font-bold text-foreground">{{ meta.canProgramada }} <span class="text-[10px] text-muted-foreground font-normal">{{ meta.unidad }}</span></span>
                        </div>
                        <div class="space-y-0.5">
                          <span class="text-[9px] uppercase font-bold text-muted-foreground block">Logrado</span>
                          <span class="text-xs font-bold text-foreground">{{ meta.canEjecutada || 0 }} <span class="text-[10px] text-muted-foreground font-normal">{{ meta.unidad }}</span></span>
                        </div>
                        <div class="space-y-0.5">
                          <span class="text-[9px] uppercase font-bold text-muted-foreground block">Avance</span>
                          <span class="text-xs font-bold" [class.text-success]="((meta.canEjecutada ?? 0) / (meta.canProgramada || 1)) >= 1" [class.text-warning]="((meta.canEjecutada ?? 0) / (meta.canProgramada || 1)) < 1">
                            {{ (meta.canProgramada > 0 ? ((meta.canEjecutada ?? 0) / meta.canProgramada) : 0) | percent:'1.0-0' }}
                          </span>
                        </div>
                      </div>
                    </div>
                  }
                  @if (filteredLegacyMetas().length === 0) {
                    <p class="text-center text-xs text-muted-foreground py-6">No hay metas físicas registradas.</p>
                  }
                </div>
              }
            </div>
          }

          <!-- R2 - Indicadores -->
          @if (activeTab() === 'R2') {
            <div class="space-y-4 animate-fade-in">
              <!-- Banner informativo sobre indicadores -->
              <div class="flex items-start gap-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
                <span class="text-xl">📈</span>
                <div class="space-y-1">
                  <p class="font-bold text-sm">Medición del impacto de tu negocio</p>
                  <p>Registra aquí los resultados reales de producción, ventas o rendimiento del negocio para ver el avance con respecto a lo programado.</p>
                </div>
              </div>

              @if (useBdSelMetas()) {
                <!-- Vista Escritorio -->
                <div class="hidden md:block">
                  <app-ui-data-table
                    [columns]="indicadoresSelColumns"
                    [data]="rtfService.pasoCriticoIndicadores()"
                    [paginator]="true"
                    [rows]="10"
                    [showIndex]="true"
                    [hasActions]="true"
                    [actionsTemplate]="indicadoresActionsTpl"
                    [rowTemplate]="indicadoresSelRowTpl"
                    emptyMessage="No hay indicadores registrados para este paso crítico."
                  />
                </div>

                <!-- Vista Móvil en Tarjetas -->
                <div class="grid grid-cols-1 gap-4 md:hidden">
                  @for (ind of rtfService.pasoCriticoIndicadores(); track ind.id) {
                    <div class="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm hover:border-primary/30 transition-all">
                      <div class="flex justify-between items-start gap-3">
                        <div class="space-y-1">
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">
                            🌱 Indicador
                          </span>
                          <h3 class="text-sm font-bold text-foreground">{{ ind.indicador }}</h3>
                          <p class="text-[10px] text-muted-foreground font-semibold">Cadena: {{ ind.cadenaProductiva }}</p>
                        </div>
                        <button
                          class="inline-flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20 p-2 text-primary hover:bg-primary hover:text-primary-foreground transition-all shrink-0"
                          (click)="openModal('indicador', ind)"
                        >
                          <span class="material-symbols-outlined text-[20px]">edit_note</span>
                        </button>
                      </div>

                      <div class="grid grid-cols-3 gap-2 bg-muted/20 rounded-xl p-3 text-center">
                        <div class="space-y-0.5">
                          <span class="text-[9px] uppercase font-bold text-muted-foreground block">L. Base</span>
                          <span class="text-xs font-bold text-foreground">{{ ind.lineaBase }}</span>
                        </div>
                        <div class="space-y-0.5">
                          <span class="text-[9px] uppercase font-bold text-muted-foreground block">Planificado</span>
                          <span class="text-xs font-bold text-foreground">{{ ind.metaProgramada }} <span class="text-[10px] text-muted-foreground font-normal">{{ ind.unidadMedida }}</span></span>
                        </div>
                        <div class="space-y-0.5">
                          <span class="text-[9px] uppercase font-bold text-muted-foreground block">Logrado</span>
                          <span class="text-xs font-bold text-foreground">{{ ind.metaEjecutada || 0 }} <span class="text-[10px] text-muted-foreground font-normal">{{ ind.unidadMedida }}</span></span>
                        </div>
                      </div>
                    </div>
                  }
                  @if (rtfService.pasoCriticoIndicadores().length === 0) {
                    <p class="text-center text-xs text-muted-foreground py-6">No hay indicadores registrados para este paso crítico.</p>
                  }
                </div>

              } @else {
                <!-- Legacy Vista Escritorio -->
                <div class="hidden md:block">
                  <app-ui-data-table
                    [columns]="indicadoresLegacyColumns"
                    [data]="rtfService.indicadores()"
                    [paginator]="true"
                    [rows]="10"
                    [showIndex]="true"
                    [hasActions]="true"
                    [actionsTemplate]="indicadoresActionsTpl"
                    [rowTemplate]="indicadoresLegacyRowTpl"
                    emptyMessage="No hay indicadores registrados."
                  />
                </div>

                <!-- Legacy Vista Móvil -->
                <div class="grid grid-cols-1 gap-4 md:hidden">
                  @for (ind of rtfService.indicadores(); track ind.ideIndicador) {
                    <div class="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm hover:border-primary/30 transition-all">
                      <div class="flex justify-between items-start gap-3">
                        <div class="space-y-1">
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">
                            📈 Medida
                          </span>
                          <h3 class="text-sm font-bold text-foreground">{{ ind.nombre }}</h3>
                        </div>
                        <button
                          class="inline-flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20 p-2 text-primary hover:bg-primary hover:text-primary-foreground transition-all shrink-0"
                          (click)="openModal('indicador', ind)"
                        >
                          <span class="material-symbols-outlined text-[20px]">edit_note</span>
                        </button>
                      </div>

                      <div class="grid grid-cols-3 gap-2 bg-muted/20 rounded-xl p-3 text-center">
                        <div class="space-y-0.5">
                          <span class="text-[9px] uppercase font-bold text-muted-foreground block">L. Base</span>
                          <span class="text-xs font-bold text-foreground">{{ ind.lineaBase }}</span>
                        </div>
                        <div class="space-y-0.5">
                          <span class="text-[9px] uppercase font-bold text-muted-foreground block">Planificado</span>
                          <span class="text-xs font-bold text-foreground">{{ ind.canProgramado }} <span class="text-[10px] text-muted-foreground font-normal">{{ ind.unidad }}</span></span>
                        </div>
                        <div class="space-y-0.5">
                          <span class="text-[9px] uppercase font-bold text-muted-foreground block">Logrado</span>
                          <span class="text-xs font-bold text-foreground">{{ ind.canEjecutado || 0 }} <span class="text-[10px] text-muted-foreground font-normal">{{ ind.unidad }}</span></span>
                        </div>
                      </div>
                    </div>
                  }
                  @if (rtfService.indicadores().length === 0) {
                    <p class="text-center text-xs text-muted-foreground py-6">No hay indicadores registrados.</p>
                  }
                </div>
              }
            </div>
          }

          <!-- F1 - Consolidado Financiero -->
          @if (activeTab() === 'F1') {
            <div class="space-y-6 animate-fade-in">
              <!-- Friendly informational banner -->
              <div class="flex items-start gap-3 text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm">
                <span class="text-xl">💰</span>
                <div class="space-y-1">
                  <p class="font-bold text-sm">Resumen Financiero de Compras</p>
                  <p>Aquí puedes ver el resumen de los pagos y adquisiciones que han sido registrados y procesados en el sistema para tu organización. Todos los montos se muestran en soles (S/).</p>
                </div>
              </div>

              <!-- Executed financial metrics card -->
              <div class="bg-surface-container-lowest border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Progreso del Presupuesto</h4>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div class="space-y-1">
                    <span class="text-[10px] text-muted-foreground block">Presupuesto Aprobado</span>
                    <span class="text-xl font-bold text-foreground">S/ {{ rtfService.budget() | number:'1.2-2' }}</span>
                  </div>
                  <div class="space-y-1">
                    <span class="text-[10px] text-muted-foreground block">Monto Desembolsado / Ejecutado</span>
                    <span class="text-xl font-bold text-primary">S/ {{ rtfService.disbursed() | number:'1.2-2' }}</span>
                  </div>
                  <div class="space-y-1">
                    <span class="text-[10px] text-muted-foreground block">Porcentaje de Avance</span>
                    <span class="text-xl font-bold text-foreground">
                      {{ (rtfService.budget() > 0 ? (rtfService.disbursed() / rtfService.budget()) : 0) | percent:'1.0-0' }}
                    </span>
                  </div>
                </div>
                <!-- Progress bar -->
                <div class="w-full bg-muted rounded-full h-2">
                  <div 
                    class="bg-primary h-2 rounded-full transition-all duration-500" 
                    [style.width.%]="rtfService.budget() > 0 ? (rtfService.disbursed() / rtfService.budget() * 100) : 0"
                  ></div>
                </div>
              </div>

              @if (rtfService.gastosF1().length === 0) {
                <!-- Vista Escritorio para Desembolsos/KOFIX -->
                <div class="hidden md:block">
                  <app-ui-data-table
                    [columns]="desembolsosColumns"
                    [data]="rtfService.disbursements()"
                    [paginator]="true"
                    [rows]="10"
                    [showIndex]="true"
                    [hasActions]="false"
                    [rowTemplate]="desembolsosRowTpl"
                    emptyMessage="No se encontraron desembolsos registrados."
                  />
                </div>

                <!-- Vista Móvil para Desembolsos/KOFIX -->
                <div class="grid grid-cols-1 gap-4 md:hidden">
                  @for (d of rtfService.disbursements(); track d.id) {
                    <div class="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-sm">
                      <div class="flex justify-between items-start">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                          🪙 Pago
                        </span>
                        <span class="text-xs font-bold text-primary">S/ {{ d.amount | number:'1.2-2' }}</span>
                      </div>
                      <h3 class="text-sm font-bold text-foreground">{{ d.item }}</h3>
                      <div class="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                        <div>
                          <span class="block text-[9px] uppercase font-bold">Fecha</span>
                          <span>{{ d.date }}</span>
                        </div>
                        <div class="text-right">
                          <span class="block text-[9px] uppercase font-bold">Estado</span>
                          <span class="text-success font-semibold">{{ d.status }}</span>
                        </div>
                      </div>
                    </div>
                  }
                  @if (rtfService.disbursements().length === 0) {
                    <p class="text-center text-xs text-muted-foreground py-6">No se encontraron desembolsos registrados.</p>
                  }
                </div>

                <div class="border-t border-border pt-4 text-right">
                  <span class="text-sm text-muted-foreground">Total desembolsado: </span>
                  <span class="text-lg font-bold text-foreground">S/ {{ rtfService.disbursed() | number:'1.2-2' }}</span>
                </div>
              } @else {
                <!-- Vista Escritorio para Gastos F1 -->
                <div class="hidden md:block">
                  <app-ui-data-table
                    [columns]="gastosColumns"
                    [data]="rtfService.gastosF1()"
                    [paginator]="true"
                    [rows]="10"
                    [showIndex]="true"
                    [hasActions]="false"
                    emptyMessage="No se encontraron gastos F1 registrados."
                  />
                </div>

                <!-- Vista Móvil para Gastos F1 -->
                <div class="grid grid-cols-1 gap-4 md:hidden">
                  @for (g of rtfService.gastosF1(); track g.txtItemNombre) {
                    <div class="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-sm">
                      <div class="flex justify-between items-start">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                          📦 Bien / Servicio
                        </span>
                        <span class="text-xs font-bold text-foreground">S/ {{ g.numMontoRendido | number:'1.2-2' }}</span>
                      </div>
                      <h3 class="text-sm font-bold text-foreground">{{ g.txtItemNombre }}</h3>
                      <p class="text-xs text-muted-foreground">Proveedor: <span class="font-semibold text-foreground">{{ g.txtProveedorNombre || 'No especificado' }}</span></p>
                      <div class="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                        <div>
                          <span class="block text-[9px] uppercase font-bold">Cantidad</span>
                          <span>{{ g.canCantidad }} {{ g.txtUnidadMedida }}</span>
                        </div>
                        <div class="text-right">
                          <span class="block text-[9px] uppercase font-bold">P. Adjudicado</span>
                          <span>S/ {{ g.numPrecioAdjudicado | number:'1.2-2' }}</span>
                        </div>
                      </div>
                    </div>
                  }
                  @if (rtfService.gastosF1().length === 0) {
                    <p class="text-center text-xs text-muted-foreground py-6">No se encontraron gastos F1 registrados.</p>
                  }
                </div>
              }
            </div>
          }

        </div>
      </div>
    </div>

    <!-- Floating Action Dock -->
    <div class="sticky bottom-6 mt-10 z-40 max-w-5xl mx-auto px-6 py-4 bg-background/80 backdrop-blur-md border border-border/60 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-2 text-xs text-muted-foreground">
        <span class="material-symbols-outlined text-[16px] text-primary">info</span>
        <span>Complete todos los campos requeridos para habilitar el envío del reporte.</span>
      </div>
      <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
        <button
          class="w-full sm:w-auto rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
          [disabled]="isSaving()"
          (click)="guardarBorrador()"
        >
          @if (isSaving()) {
            <span class="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
          } @else {
            <span class="material-symbols-outlined text-[18px]">save</span>
          }
          Guardar Borrador
        </button>
        <button
          class="w-full sm:w-auto rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
          [disabled]="isSubmitting() || !canSubmit()"
          (click)="enviarRtf()"
        >
          @if (isSubmitting()) {
            <span class="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
          } @else {
            <span class="material-symbols-outlined text-[18px]">send</span>
          }
          Enviar RTF
        </button>
      </div>
    </div>
    <div class="h-8"></div>

    <!-- Avance Modal -->
    <app-ui-modal
      [visible]="modalOpen()"
      [title]="'Registrar mi Avance Real'"
      [subtitle]="modalTitle()"
      [icon]="'edit_note'"
      [saveLabel]="'Confirmar y Guardar'"
      [saveDisabled]="editEjecutado() == null || editEjecutado()! < 0"
      [isSubmitting]="isSaving()"
      (onHide)="closeModal()"
      (onSave)="saveModalAvance()"
    >
      <div class="space-y-6">
        
        <!-- Context Summary Panel (Fitted with institutional colors and soft design) -->
        <div class="bg-primary/5 border border-primary/10 rounded-2xl p-5 space-y-4">
          <div class="flex items-center gap-2">
            <span class="text-lg">🎯</span>
            <span class="text-xs font-bold text-primary uppercase tracking-wider">Metas que debemos alcanzar (Tu Plan)</span>
          </div>
          <div class="grid grid-cols-2 gap-4 bg-white/60 p-4 rounded-xl border border-primary/5">
            
            <!-- Physical Goal Context -->
            <div class="space-y-0.5">
              <span class="text-[10px] uppercase font-bold text-muted-foreground block">Meta Programada:</span>
              <p class="text-base font-bold text-foreground">
                @if (modalMode() === 'meta') {
                  {{ useBdSelMetas() ? asAny(activeModalItem())?.metaFisicaProgramada : asAny(activeModalItem())?.canProgramada }} 
                } @else {
                  {{ useBdSelMetas() ? asAny(activeModalItem())?.metaProgramada : asAny(activeModalItem())?.canProgramado }}
                }
                <span class="text-xs font-medium text-muted-foreground ml-1">{{ modalUnidad() }}</span>
              </p>
            </div>

            @if (modalMode() === 'indicador') {
              <div class="space-y-0.5">
                <span class="text-[10px] uppercase font-bold text-muted-foreground block">Línea de Base:</span>
                <p class="text-base font-bold text-foreground">
                  {{ asAny(activeModalItem())?.lineaBase ?? '0' }}
                  <span class="text-xs font-medium text-muted-foreground ml-1">{{ modalUnidad() }}</span>
                </p>
              </div>
            }

          </div>
        </div>

        <!-- Input Fields Group -->
        <div class="space-y-5">
          
          <!-- Cantidad Ejecutada -->
          <div class="space-y-2">
            <label class="block text-sm font-bold text-foreground flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[20px] text-success">analytics</span>
              ¿Cuánto has avanzado realmente en tu campo?
              <span class="text-destructive">*</span>
            </label>
            <p class="text-xs text-muted-foreground">Escribe la cantidad de unidades cosechadas o ejecutadas en este periodo.</p>
            
            <div class="relative flex items-center">
              <input
                type="number"
                class="w-full rounded-2xl border-2 border-border bg-surface-container/10 px-5 py-4 pr-16 text-lg focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary font-bold text-foreground shadow-inner"
                placeholder="Ej. 10"
                [(ngModel)]="editEjecutado"
              />
              <span class="absolute right-5 text-sm font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-lg pointer-events-none">{{ modalUnidad() }}</span>
            </div>
          </div>

          <!-- Meta Programada (BD_SEL Indicador - Edit Programado Target) -->
          @if (useBdSelMetas() && modalMode() === 'indicador') {
            <div class="space-y-2">
              <label class="block text-sm font-bold text-foreground flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[20px] text-primary">edit_calendar</span>
                Corregir Meta Planificada (Opcional)
              </label>
              <p class="text-xs text-muted-foreground">Si deseas modificar la meta planificada originalmente, hazlo aquí.</p>
              <input
                type="number"
                step="0.01"
                class="w-full rounded-2xl border-2 border-border bg-surface-container/10 px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary font-bold text-foreground"
                placeholder="Ingrese la nueva meta programada"
                [(ngModel)]="editMetaProgramada"
              />
            </div>
          }

          <!-- Comentario -->
          <div class="space-y-2">
            <label class="block text-sm font-bold text-foreground flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[20px] text-muted-foreground">comment</span>
              ¿Tienes algún comentario o explicación sobre tu avance?
            </label>
            <p class="text-xs text-muted-foreground">Ej: "Tuvimos buena cosecha por clima", "Retraso por lluvias".</p>
            <textarea
              class="w-full rounded-2xl border-2 border-border bg-surface-container/10 px-5 py-3 text-sm resize-y min-h-[100px] focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary"
              placeholder="Escribe aquí de forma libre y detallada..."
              [(ngModel)]="editComentario"
            ></textarea>
          </div>

          <!-- Evidencias -->
          <div class="space-y-2">
            <label class="block text-sm font-bold text-foreground flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[20px] text-primary font-bold">attach_file</span>
              Documentos de Sustento o Evidencias (PDF)
            </label>
            <p class="text-xs text-muted-foreground">Sube tus fotos, actas, boletas o facturas en formato PDF.</p>

            <!-- Existing evidencias -->
            @if (modalEvidencias().length > 0) {
              <div class="space-y-2 mb-3">
                @for (ev of modalEvidencias(); track ev.ideEvidencia) {
                  <div class="flex items-center gap-2 rounded-xl border border-border bg-emerald-50/50 px-4 py-3 text-sm">
                    <span class="material-symbols-outlined text-[20px] text-emerald-600">verified</span>
                    <button
                      class="flex-1 truncate text-left hover:underline text-foreground font-medium"
                      (click)="viewPdf(ev.ideEvidencia, ev.txtNombreArchivo ?? 'documento.pdf')"
                    >
                      {{ ev.txtNombreArchivo ?? 'Documento cargado' }}
                    </button>
                    <span class="text-xs text-muted-foreground font-bold mr-2">PDF</span>
                    <button
                      class="rounded-full p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
                      (click)="removeEvidencia(ev.ideEvidencia)"
                      type="button"
                    >
                      <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                }
              </div>
            }

            <!-- New evidence upload -->
            <div
              class="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center transition-all hover:border-primary hover:bg-primary/10 shadow-sm"
              (click)="fileInput.click()"
              (dragover)="$event.preventDefault()"
              (drop)="onModalFileDrop($event)"
            >
              <span class="material-symbols-outlined text-[36px] text-primary">cloud_upload</span>
              <div class="text-sm font-bold text-foreground">Presiona aquí o arrastra tu archivo para subirlo</div>
              <div class="text-xs text-muted-foreground font-semibold">Solo archivos PDF (Hasta 10 MB)</div>
              <input
                #fileInput
                type="file"
                accept="application/pdf"
                class="hidden"
                (change)="onModalFileSelect($event)"
              />
            </div>

            <!-- Pending files -->
            @if (pendingFiles().length > 0) {
              <div class="space-y-2 mt-3">
                @for (f of pendingFiles(); track f.name) {
                  <div class="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                    <span class="material-symbols-outlined text-[18px] text-primary">description</span>
                    <span class="flex-1 truncate text-foreground font-medium">{{ f.name }}</span>
                    <span class="text-xs text-muted-foreground mr-2 font-bold">{{ sizeKB(f.size) }} KB</span>
                    <button
                      class="rounded-full p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
                      (click)="removePendingFile(f.name)"
                      type="button"
                    >
                      <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </app-ui-modal>

    <!-- PDF Viewer Modal -->
    @if (pdfViewerOpen()) {
      <ui-pdf-viewer
        [open]="pdfViewerOpen()"
        [filename]="pdfViewerFilename()"
        [fileUrl]="pdfViewerFileUrl()"
        [downloadUrl]="pdfViewerDownloadUrl()"
        (onOpenChange)="onPdfViewerClose()"
      />
    }

    <!-- Templates para las celdas personalizadas y acciones de las tablas -->
    <ng-template #metasActionsTpl let-row>
      <button
        class="inline-flex items-center justify-center rounded-full bg-primary/10 border border-primary/20 p-2 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 shadow-sm"
        [style.width]="'36px'"
        [style.height]="'36px'"
        (click)="openModal('meta', row)"
        title="Registrar avance"
      >
        <span class="material-symbols-outlined text-[20px]">edit_note</span>
      </button>
    </ng-template>

    <ng-template #indicadoresActionsTpl let-row>
      <button
        class="inline-flex items-center justify-center rounded-full bg-primary/10 border border-primary/20 p-2 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 shadow-sm"
        [style.width]="'36px'"
        [style.height]="'36px'"
        (click)="openModal('indicador', row)"
        title="Registrar avance"
      >
        <span class="material-symbols-outlined text-[20px]">edit_note</span>
      </button>
    </ng-template>

    <ng-template #metasSelRowTpl let-row let-col="col">
      @if (col.field === 'metaFisicaEjecutada') {
        @if (row.metaFisicaEjecutada > 0) {
          <span>{{ row.metaFisicaEjecutada }}</span>
        } @else {
          <span class="text-muted-foreground/50">—</span>
        }
      }
      @if (col.field === 'metaFisicaAvance') {
        @if (row.metaFisicaEjecutada > 0 && row.metaFisicaProgramada > 0) {
          <span class="text-xs font-bold" [class.text-success]="(row.metaFisicaEjecutada / row.metaFisicaProgramada) >= 1" [class.text-warning]="(row.metaFisicaEjecutada / row.metaFisicaProgramada) < 1">
            {{ (row.metaFisicaEjecutada / row.metaFisicaProgramada) | percent:'1.0-0' }}
          </span>
        } @else {
          <span class="text-muted-foreground/50">—</span>
        }
      }
    </ng-template>

    <ng-template #metasLegacyRowTpl let-row let-col="col">
      @if (col.field === 'canEjecutada') {
        @if (row.canEjecutada != null) {
          <span>{{ row.canEjecutada }}</span>
        } @else {
          <span class="text-muted-foreground/50">—</span>
        }
      }
      @if (col.field === 'avancePct') {
        @if (row.canEjecutada != null && row.canProgramada > 0) {
          <span class="text-xs font-bold" [class.text-success]="(row.canEjecutada / row.canProgramada) >= 1" [class.text-warning]="(row.canEjecutada / row.canProgramada) < 1">
            {{ (row.canEjecutada / row.canProgramada) | percent:'1.0-0' }}
          </span>
        } @else {
          <span class="text-muted-foreground/50">—</span>
        }
      }
    </ng-template>

    <ng-template #indicadoresSelRowTpl let-row let-col="col">
      @if (col.field === 'metaEjecutada') {
        @if (row.metaEjecutada != null) {
          <span>{{ row.metaEjecutada }}</span>
        } @else {
          <span class="text-muted-foreground/50">—</span>
        }
      }
      @if (col.field === 'avancePct') {
        @if (row.metaEjecutada != null && row.metaProgramada > 0) {
          <span class="text-xs font-bold" [class.text-success]="(row.metaEjecutada / row.metaProgramada) >= 1" [class.text-warning]="(row.metaEjecutada / row.metaProgramada) < 1">
            {{ (row.metaEjecutada / row.metaProgramada) | percent:'1.0-0' }}
          </span>
        } @else {
          <span class="text-muted-foreground/50">—</span>
        }
      }
    </ng-template>

    <ng-template #indicadoresLegacyRowTpl let-row let-col="col">
      @if (col.field === 'canEjecutado') {
        @if (row.canEjecutado != null) {
          <span>{{ row.canEjecutado }}</span>
        } @else {
          <span class="text-muted-foreground/50">—</span>
        }
      }
      @if (col.field === 'avancePct') {
        @if (row.canEjecutado != null && row.canProgramado > 0) {
          <span class="text-xs font-bold" [class.text-success]="(row.canEjecutado / row.canProgramado) >= 1" [class.text-warning]="(row.canEjecutado / row.canProgramado) < 1">
            {{ (row.canEjecutado / row.canProgramado) | percent:'1.0-0' }}
          </span>
        } @else {
          <span class="text-muted-foreground/50">—</span>
        }
      }
    </ng-template>

    <ng-template #desembolsosRowTpl let-row let-col="col">
      @if (col.field === 'status') {
        <span
          class="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
          [ngClass]="{
            'text-success border-success/20 bg-success-soft': row.status === 'Ejecutado',
            'text-warning border-warning/20 bg-warning/10': row.status === 'Pendiente'
          }"
        >
          {{ row.status }}
        </span>
      }
    </ng-template>
  `
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
