import { ChangeDetectionStrategy, Component, OnInit, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarteraRepository, Ubigeo } from '../../../domain/repositories/cartera.repository';

export interface UbigeoFiltro {
    departamentoCodigo?: string;
    provinciaCodigo?: string;
    distritoCodigo?: string;
}

@Component({
    selector: 'app-ubigeo-cascada-filter',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './ubigeo-cascada-filter.component.html',
    // display:contents saca el host de la caja: sus 3 <select> pasan a ser celdas
    // directas del grid del contenedor padre (.filters-geo-grid en cartera.page),
    // en vez de quedar agrupados como un único bloque dentro de ese grid.
    host: { style: 'display: contents' },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UbigeoCascadaFilterComponent implements OnInit {
    private carteraRepo = inject(CarteraRepository);

    filtroChange = output<UbigeoFiltro>();

    departamentos = signal<Ubigeo[]>([]);
    provincias = signal<Ubigeo[]>([]);
    distritos = signal<Ubigeo[]>([]);

    departamentoCodigo = signal('');
    provinciaCodigo = signal('');
    distritoCodigo = signal('');

    ngOnInit(): void {
        this.carteraRepo.getUbigeos('DEPARTAMENTO').subscribe(items => this.departamentos.set(items));
    }

    onDepartamentoChange(nuevoCodigo: string): void {
        this.departamentoCodigo.set(nuevoCodigo);
        this.provinciaCodigo.set('');
        this.distritoCodigo.set('');
        this.provincias.set([]);
        this.distritos.set([]);

        if (nuevoCodigo) {
            this.carteraRepo.getUbigeos('PROVINCIA', nuevoCodigo).subscribe(items => this.provincias.set(items));
        }
        this.emitirCambio();
    }

    onProvinciaChange(nuevoCodigo: string): void {
        this.provinciaCodigo.set(nuevoCodigo);
        this.distritoCodigo.set('');
        this.distritos.set([]);

        if (nuevoCodigo) {
            this.carteraRepo.getUbigeos('DISTRITO', nuevoCodigo).subscribe(items => this.distritos.set(items));
        }
        this.emitirCambio();
    }

    onDistritoChange(nuevoCodigo: string): void {
        this.distritoCodigo.set(nuevoCodigo);
        this.emitirCambio();
    }

    private emitirCambio(): void {
        this.filtroChange.emit({
            departamentoCodigo: this.departamentoCodigo() || undefined,
            provinciaCodigo: this.provinciaCodigo() || undefined,
            distritoCodigo: this.distritoCodigo() || undefined
        });
    }
}
