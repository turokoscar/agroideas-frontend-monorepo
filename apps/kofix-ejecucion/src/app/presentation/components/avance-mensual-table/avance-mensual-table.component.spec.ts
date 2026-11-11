import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvanceMensualTableComponent } from './avance-mensual-table.component';
import { CeldaAvance, NivelSemaforo, ReporteAvance } from '../../../domain/models/reporte/reporte-avance.model';

const celda = (anio: number | null, mes: number | null, programado: number, ejecutado: number, nivel: NivelSemaforo, porcentaje: number | null): CeldaAvance =>
    ({ anio, mes, programado, ejecutado, saldo: programado - ejecutado, porcentaje, nivel });

export const reporteDePrueba = (): ReporteAvance => ({
    fechaInicio: '2026-07-01',
    fechaFin: '2026-08-31',
    umbrales: { buena: 90, regular: 70 },
    meses: [{ anio: 2026, mes: 7 }, { anio: 2026, mes: 8 }],
    filas: [
        {
            region: 'CAJAMARCA',
            celdas: [celda(2026, 7, 10000, 9500, 'BUENA', 95), celda(2026, 8, 0, 7200, 'EJECUTADO_SIN_PROGRAMACION', null)],
            total: celda(null, null, 10000, 16700, 'BUENA', 167)
        },
        {
            region: 'PUNO',
            celdas: [celda(2026, 7, 2000, 1500, 'REGULAR', 75), celda(2026, 8, 0, 0, 'SIN_PROGRAMACION', null)],
            total: celda(null, null, 2000, 1500, 'REGULAR', 75)
        }
    ],
    totalNacional: {
        region: 'TOTAL NACIONAL',
        celdas: [celda(2026, 7, 12000, 11000, 'BUENA', 91.7), celda(2026, 8, 0, 7200, 'EJECUTADO_SIN_PROGRAMACION', null)],
        total: celda(null, null, 12000, 18200, 'BUENA', 151.7)
    }
});

describe('AvanceMensualTableComponent', () => {
    let fixture: ComponentFixture<AvanceMensualTableComponent>;
    let html: HTMLElement;

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [AvanceMensualTableComponent] });
        fixture = TestBed.createComponent(AvanceMensualTableComponent);
        fixture.componentRef.setInput('reporte', reporteDePrueba());
        fixture.detectChanges();
        html = fixture.nativeElement;
    });

    it('arma un grupo Prog./Ejec./Saldo por mes más el total del periodo', () => {
        const encabezados = Array.from(html.querySelectorAll('thead tr:first-child th')).map(th => (th.textContent ?? '').trim());
        expect(encabezados).toEqual(['Región', 'Jul 2026', 'Ago 2026', 'Total del periodo']);
        expect(html.querySelectorAll('thead tr:nth-child(2) th')).toHaveLength(9);
    });

    it('muestra una fila por región y el total nacional al pie', () => {
        const filas = Array.from(html.querySelectorAll('tbody th[scope="row"]')).map(th => (th.textContent ?? '').trim());
        expect(filas).toEqual(['CAJAMARCA', 'PUNO']);
        expect((html.querySelector('tfoot th')?.textContent ?? '').trim()).toBe('TOTAL NACIONAL');
        // 1 encabezado de fila + 3 celdas x (2 meses + total)
        expect(html.querySelectorAll('tbody tr:first-child td')).toHaveLength(9);
    });

    it('colorea cada grupo según el nivel que envía la API', () => {
        const celdas = html.querySelectorAll('tbody tr:first-child td');
        expect(celdas[0].className).toContain('bg-success-soft');           // CAJAMARCA jul: buena
        expect(celdas[3].className).toContain('ring-danger');               // CAJAMARCA ago: alerta
        const puno = html.querySelectorAll('tbody tr:nth-child(2) td');
        expect(puno[0].className).toContain('bg-warning-soft');              // regular
        expect(puno[3].className).toContain('bg-muted');                     // sin programación
    });

    it('muestra el % bajo el ejecutado y el ícono de alerta en el ejecutado sin programación', () => {
        const celdas = html.querySelectorAll('tbody tr:first-child td');
        expect(celdas[1].textContent).toContain('95');
        expect(celdas[1].textContent).toContain('%');
        expect(celdas[4].textContent).toContain('warning');
        expect(celdas[4].textContent).toContain('—');
    });

    it('cuando programado y ejecutado son 0 muestra guión y nunca NaN (incluso si porcentaje viene undefined)', () => {
        const reporte = reporteDePrueba();
        // Simula JSON con NullValueHandling.Ignore donde porcentaje llega undefined
        reporte.filas[1].celdas[1] = { anio: 2026, mes: 8, programado: 0, ejecutado: 0, saldo: 0, porcentaje: undefined, nivel: 'SIN_PROGRAMACION' };
        fixture.componentRef.setInput('reporte', { ...reporte });
        fixture.detectChanges();

        const punoCeldas = html.querySelectorAll('tbody tr:nth-child(2) td');
        expect(punoCeldas[4].textContent).toContain('—');
        expect(html.textContent).not.toContain('NaN');
    });

    it('describe cada celda en texto (no solo color) para lectores de pantalla', () => {
        const primera = html.querySelector('tbody tr:first-child td');
        expect(primera?.getAttribute('aria-label')).toContain('CAJAMARCA, Jul 2026');
        expect(primera?.getAttribute('aria-label')).toContain('Buena');
        expect(html.querySelectorAll('tbody tr:first-child td')[3].getAttribute('title')).toContain('Alerta: ejecutado sin programación');
    });

    it('la leyenda usa los umbrales que envía la API', () => {
        const leyenda = html.querySelector('ul[aria-label="Leyenda del semáforo"]')?.textContent ?? '';
        expect(leyenda).toContain('Buena: 90% o más');
        expect(leyenda).toContain('Mala: menos de 70%');
        expect(leyenda).toContain('ejecutado sin programación');
    });
});
