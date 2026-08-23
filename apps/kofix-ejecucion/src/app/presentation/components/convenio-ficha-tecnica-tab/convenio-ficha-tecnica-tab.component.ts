import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UIButtonComponent, UiMapComponent } from '@agroideas/ui';
import { Convenio } from '../../../domain/models/convenio.model';

@Component({
    selector: 'app-convenio-ficha-tecnica-tab',
    standalone: true,
    imports: [UIButtonComponent, UiMapComponent],
    templateUrl: './convenio-ficha-tecnica-tab.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConvenioFichaTecnicaTabComponent {
    convenio = input.required<Convenio>();

    downloadConvenioFisico = output<void>();
    downloadKardexResumen = output<void>();
    downloadReporteProgramacion = output<void>();

    formatDate(date?: string): string {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('es-PE');
    }
}
