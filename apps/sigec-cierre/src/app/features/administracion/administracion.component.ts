import { Component, signal } from '@angular/core';
import { UiTab, UiTabsComponent } from '@agroideas/ui';
import { FeriadosComponent } from './feriados.component';
import { ParametrosComponent } from './parametros.component';

type PestanaAdmin = 'feriados' | 'parametros';

/** Administración del módulo de cierre (ADR 0013 Fase 5): calendario de días inhábiles y parámetros. Solo ADMIN. */
@Component({
  selector: 'app-administracion',
  standalone: true,
  host: { class: 'block' },
  imports: [UiTabsComponent, FeriadosComponent, ParametrosComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-foreground">Administración</h2>
        <p class="text-sm text-muted-foreground">Calendario de días inhábiles y parámetros del cierre de convenios.</p>
      </div>
      <ui-tabs [tabs]="pestanas" [active]="pestana()" ariaLabel="Secciones de administración" panelId="administracion-panel" contained
        (activeChange)="pestana.set($any($event))" />
      <div id="administracion-panel" role="tabpanel">
        @if (pestana() === 'feriados') { <app-feriados /> } @else { <app-parametros /> }
      </div>
    </div>
  `
})
export class AdministracionComponent {
  readonly pestanas: readonly UiTab[] = [
    { key: 'feriados', label: 'Días inhábiles' },
    { key: 'parametros', label: 'Parámetros' }
  ];
  pestana = signal<PestanaAdmin>('feriados');
}
