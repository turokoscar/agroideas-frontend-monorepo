import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { CeldaAvance, NivelSemaforo, ReporteAvance } from '../../../domain/models/reporte/reporte-avance.model';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

/** Clases (tokens del tema) y texto de cada nivel del semáforo (ADR-028). */
export const NIVELES: Record<NivelSemaforo, { claseMonto: string; claseBadge: string; etiqueta: string; icono?: string }> = {
    BUENA: {
        claseMonto: 'bg-success-soft/35 text-foreground',
        claseBadge: 'bg-success-soft text-success font-bold',
        etiqueta: 'Buena'
    },
    REGULAR: {
        claseMonto: 'bg-warning-soft/35 text-foreground',
        claseBadge: 'bg-warning-soft text-warning font-bold',
        etiqueta: 'Regular'
    },
    MALA: {
        claseMonto: 'bg-danger-soft/35 text-foreground',
        claseBadge: 'bg-danger-soft text-danger font-bold',
        etiqueta: 'Mala'
    },
    SIN_PROGRAMACION: {
        claseMonto: 'bg-muted/30 text-muted-foreground/60',
        claseBadge: 'bg-muted text-muted-foreground',
        etiqueta: 'Sin programación'
    },
    EJECUTADO_SIN_PROGRAMACION: {
        claseMonto: 'bg-danger-soft/20 text-danger',
        claseBadge: 'bg-card text-danger ring-1 ring-inset ring-danger font-bold',
        etiqueta: 'Alerta: ejecutado sin programación',
        icono: 'warning'
    }
};

/**
 * Cuadro de avance mensual por región (ADR-028): por mes, programado / ejecutado / saldo con el
 * color del semáforo que decide la API, más el total del periodo y la fila "Total nacional".
 * El nivel también va en texto (title y aria-label): el color no es la única señal.
 */
@Component({
    selector: 'app-avance-mensual-table',
    standalone: true,
    imports: [NgTemplateOutlet],
    templateUrl: './avance-mensual-table.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AvanceMensualTableComponent {
    readonly reporte = input.required<ReporteAvance>();

    readonly niveles = NIVELES;
    readonly leyenda = computed(() => {
        const u = this.reporte().umbrales;
        return [
            { nivel: 'BUENA' as NivelSemaforo, texto: `Buena: ${this.numero(u.buena)}% o más (incluye sobreejecución)` },
            { nivel: 'REGULAR' as NivelSemaforo, texto: `Regular: de ${this.numero(u.regular)}% a menos de ${this.numero(u.buena)}%` },
            { nivel: 'MALA' as NivelSemaforo, texto: `Mala: menos de ${this.numero(u.regular)}%` },
            { nivel: 'SIN_PROGRAMACION' as NivelSemaforo, texto: 'Sin programación ni ejecución' },
            { nivel: 'EJECUTADO_SIN_PROGRAMACION' as NivelSemaforo, texto: 'Alerta: ejecutado sin programación en el mes' }
        ];
    });

    /** Clases de las celdas de monto (tinte suave; el contexto de ng-template no tiene tipo). */
    claseMonto(celda: CeldaAvance): string {
        return NIVELES[celda.nivel]?.claseMonto ?? '';
    }

    /** Clases del badge de % (semáforo de alto contraste). */
    claseBadge(celda: CeldaAvance): string {
        return NIVELES[celda.nivel]?.claseBadge ?? '';
    }

    icono(celda: CeldaAvance): string | undefined {
        return NIVELES[celda.nivel]?.icono;
    }

    nombreMes(m: { anio: number; mes: number }): string {
        return `${MESES[m.mes - 1] ?? m.mes} ${m.anio}`;
    }

    monto(valor: number): string {
        return new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 }).format(valor);
    }

    porcentaje(celda: CeldaAvance): string {
        return celda.porcentaje == null || !Number.isFinite(celda.porcentaje) || celda.programado <= 0
            ? '—'
            : `${new Intl.NumberFormat('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(celda.porcentaje)}%`;
    }

    /** Texto accesible de la celda: lugar, montos y nivel. */
    descripcion(region: string, titulo: string, celda: CeldaAvance): string {
        return `${region}, ${titulo}: programado ${this.monto(celda.programado)}, ejecutado ${this.monto(celda.ejecutado)}, ` +
            `saldo ${this.monto(celda.saldo)}, ${this.porcentaje(celda)}, ${NIVELES[celda.nivel].etiqueta}`;
    }

    private numero(v: number): string {
        return new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(v);
    }
}
