import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-organizaciones',
  standalone: true,
  template: '<div class="p-8"><h1>Organizaciones Agrarias</h1><p class="text-muted-foreground">Gestión de OAs beneficiarias.</p></div>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrganizacionesComponent {}
