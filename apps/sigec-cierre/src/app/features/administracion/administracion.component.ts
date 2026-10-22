import { Component, signal } from '@angular/core';
import { FeriadosComponent } from './feriados.component';
import { ParametrosComponent } from './parametros.component';

type PestanaAdmin = 'feriados' | 'parametros';

/** Administración del módulo de cierre (ADR 0013 Fase 5): calendario de días inhábiles y parámetros. Solo ADMIN. */
@Component({
  selector: 'app-administracion',
  standalone: true,
  host: { class: 'block' },
  imports: [FeriadosComponent, ParametrosComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-foreground">Administración</h2>
        <p class="text-sm text-muted-foreground">Calendario de días inhábiles y parámetros del cierre de convenios.</p>
      </div>
      <div class="flex gap-1 rounded-xl bg-muted p-1" role="tablist">
        @for (t of pestanas; track t.clave) {
          <button type="button" role="tab" class="rounded-lg px-3 py-1.5 text-xs font-semibold" [attr.aria-selected]="pestana() === t.clave"
            [class.bg-primary]="pestana() === t.clave" [class.text-primary-foreground]="pestana() === t.clave"
            [class.text-muted-foreground]="pestana() !== t.clave" (click)="pestana.set(t.clave)">{{ t.etiqueta }}</button>
        }
      </div>
      @if (pestana() === 'feriados') { <app-feriados /> } @else { <app-parametros /> }
    </div>
  `
})
export class AdministracionComponent {
  readonly pestanas: readonly { clave: PestanaAdmin; etiqueta: string }[] = [
    { clave: 'feriados', etiqueta: 'Días inhábiles' },
    { clave: 'parametros', etiqueta: 'Parámetros' }
  ];
  pestana = signal<PestanaAdmin>('feriados');
}
