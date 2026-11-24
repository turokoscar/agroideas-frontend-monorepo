import { AlertService } from '@agroideas/feedback';
import { UIButtonComponent, UiFileChipComponent, UiStateComponent, UiStatusPillComponent, StatusType } from '@agroideas/ui';
import { formatCurrency } from '@agroideas/utils';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import {
    EvaluacionCotizacion, EvaluacionItemCalculado, EvaluacionNoObjecion, EvaluacionPrecio, EvaluacionPropuestas,
    ResultadoEvaluacion, activoYHabido, adjudicadoNoEsElMenor, adjudicar, esRucValido, ofertasDe, precioDe, totalHoja
} from '../../../domain/models/evaluacion-no-objecion.model';
import { NoObjecionProgrammedItem } from '../../../domain/models/no-objecion-programmed-item.model';
import { EvaluacionNoObjecionRepository } from '../../../domain/repositories/evaluacion-no-objecion.repository';
import { NoObjecionRepository } from '../../../domain/repositories/no-objecion.repository';

type Paso = 'solicitud' | 'items' | 'cotizaciones' | 'evaluacion' | 'envio';

/** Evaluación de proveedores de una N.O., pensada para transcribir cotizaciones en papel (API ADR-032 D6). */
@Component({
    selector: 'app-evaluacion-no-objecion-page',
    standalone: true,
    imports: [CommonModule, FormsModule, UIButtonComponent, UiFileChipComponent, UiStateComponent, UiStatusPillComponent],
    templateUrl: './evaluacion-no-objecion.page.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EvaluacionNoObjecionPageComponent implements OnInit, OnDestroy {
    static readonly ESPERA_GUARDADO = 1500;

    private repo = inject(EvaluacionNoObjecionRepository);
    private noObjecionRepo = inject(NoObjecionRepository);
    private alertService = inject(AlertService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private cdr = inject(ChangeDetectorRef);

    readonly pasos: { id: Paso; titulo: string }[] = [
        { id: 'solicitud', titulo: '1. Solicitud' },
        { id: 'items', titulo: '2. Ítems' },
        { id: 'cotizaciones', titulo: '3. Cotizaciones' },
        { id: 'evaluacion', titulo: '4. Evaluación' },
        { id: 'envio', titulo: '5. Informe y envío' }
    ];
    readonly documentos: { campo: 'docCarta' | 'docActa' | 'docDeclaracion' | 'docCuadro' | 'docCotizaciones'; nombre: string }[] = [
        { campo: 'docCarta', nombre: 'Carta de la asociación' },
        { campo: 'docActa', nombre: 'Acta de comité de adquisiciones' },
        { campo: 'docDeclaracion', nombre: 'Declaración jurada de no vínculo' },
        { campo: 'docCuadro', nombre: 'Cuadro comparativo de proveedores' },
        { campo: 'docCotizaciones', nombre: 'Cotizaciones con firmas' }
    ];

    convenioId = 0;
    paso = signal<Paso>('solicitud');
    cargando = signal(true);
    error = signal<string | null>(null);
    guardando = signal(false);
    /** Hay cambios que todavía no se guardan. */
    pendienteGuardar = signal(false);
    errorGuardado = signal<string | null>(null);
    procesando = signal(false);
    evaluacion = signal<EvaluacionNoObjecion | null>(null);
    calculados = signal<EvaluacionItemCalculado[]>([]);
    pendientes = signal<string[]>([]);
    propuestas = signal<EvaluacionPropuestas | null>(null);
    programados = signal<NoObjecionProgrammedItem[]>([]);
    hojaActiva = signal(0);
    /** Total escrito en el papel, por RUC: solo para contrastar. */
    totalPapel: Record<string, number | null> = {};

    numeroInforme = '';
    fechaInforme = '';
    archivoInforme = signal<File | null>(null);

    private temporizador?: ReturnType<typeof setTimeout>;
    private guardado: Promise<boolean> | null = null;

    ngOnInit(): void {
        this.convenioId = Number(this.route.snapshot.paramMap.get('id'));
        this.cargar(Number(this.route.snapshot.paramMap.get('evaluacionId')));
    }

    ngOnDestroy(): void {
        clearTimeout(this.temporizador);
        if (this.pendienteGuardar()) void this.guardar();
    }

    @HostListener('window:beforeunload', ['$event'])
    alSalir(evento: BeforeUnloadEvent): void {
        if (this.pendienteGuardar() || this.guardando()) evento.preventDefault();
    }

    private cargar(id: number): void {
        this.repo.get(id).subscribe({
            next: d => {
                this.evaluacion.set(d.evaluacion);
                this.calculados.set(d.items);
                this.pendientes.set(d.pendientes);
                this.cargando.set(false);
                this.cargarProgramados(d.evaluacion);
                this.cargarPropuestas(id);
            },
            error: (e: HttpErrorResponse) => {
                this.error.set(e.error?.mensaje || 'No se pudo cargar la evaluación.');
                this.cargando.set(false);
            }
        });
    }

    private cargarProgramados(e: EvaluacionNoObjecion): void {
        this.noObjecionRepo.getProgrammedItemsWithBalance(e.postulanteId, e.items.map(i => i.itemMlId)).subscribe({
            next: items => this.programados.set(items),
            error: () => this.alertService.toast('No se pudieron cargar los ítems programados.', 'warning')
        });
    }

    private cargarPropuestas(id: number): void {
        this.repo.getPropuestas(id).subscribe({
            next: p => {
                this.propuestas.set(p);
                this.proponerEvaluador(p.especialista);
            },
            error: () => undefined
        });
    }

    /** "DE:" del informe: el especialista asignado, si todavía no se indicó otro. */
    private proponerEvaluador(especialista?: string | null): void {
        const e = this.evaluacion();
        if (!e?.editable || e.evaluador || !especialista) return;
        e.evaluador = especialista;
        this.cambio();
    }

    // ---- Guardado automático ------------------------------------------------------------------------------------

    /** Se llama en cada cambio: guarda cuando el especialista deja de escribir. */
    cambio(): void {
        if (!this.evaluacion()?.editable) return;
        this.pendienteGuardar.set(true);
        clearTimeout(this.temporizador);
        this.temporizador = setTimeout(() => void this.guardar(), EvaluacionNoObjecionPageComponent.ESPERA_GUARDADO);
    }

    /** Guarda lo pendiente; true si todo quedó guardado. Nunca hay dos guardados a la vez. */
    async guardar(): Promise<boolean> {
        clearTimeout(this.temporizador);
        if (this.guardado) await this.guardado;
        if (!this.pendienteGuardar()) return !this.errorGuardado();
        this.guardado = this.ejecutarGuardado();
        const ok = await this.guardado;
        this.guardado = null;
        return ok && this.pendienteGuardar() ? this.guardar() : ok;
    }

    private async ejecutarGuardado(): Promise<boolean> {
        const e = this.evaluacion();
        if (!e) return false;
        this.pendienteGuardar.set(false);
        this.guardando.set(true);
        try {
            e.version = await firstValueFrom(this.repo.guardar(e));
            this.errorGuardado.set(null);
            this.incorporar(await firstValueFrom(this.repo.get(e.id)));
            return true;
        } catch (err) {
            this.pendienteGuardar.set(true);
            this.errorGuardado.set(this.mensaje(err, 'No se pudo guardar. Revise los datos o su conexión.'));
            return false;
        } finally {
            this.guardando.set(false);
            this.cdr.markForCheck();
        }
    }

    /** Toma lo calculado y lo de SUNAT sin pisar lo que se está escribiendo. */
    private incorporar(d: { evaluacion: EvaluacionNoObjecion; items: EvaluacionItemCalculado[]; pendientes: string[] }): void {
        const e = this.evaluacion();
        if (!e) return;
        e.versionInforme = d.evaluacion.versionInforme;
        for (const hoja of e.cotizaciones) {
            const guardada = d.evaluacion.cotizaciones.find(c => c.ruc === hoja.ruc);
            if (!guardada?.verificado) {
                if (guardada) hoja.verificado = false;
                continue;
            }
            hoja.verificado = true;
            hoja.razonSocial = guardada.razonSocial;
            hoja.estadoSunat = guardada.estadoSunat;
            hoja.condicionSunat = guardada.condicionSunat;
            hoja.fechaInscripcion = guardada.fechaInscripcion;
        }
        this.calculados.set(d.items);
        this.pendientes.set(d.pendientes);
    }

    // ---- Ítems --------------------------------------------------------------------------------------------------

    disponibles(): NoObjecionProgrammedItem[] {
        const usados = new Set(this.evaluacion()?.items.map(i => i.itemMlId));
        return this.programados().filter(p => !usados.has(p.id) && p.saldoFisico > 0 && p.saldoFinanciero > 0);
    }

    agregarItem(p: NoObjecionProgrammedItem): void {
        this.evaluacion()?.items.push({ itemMlId: p.id, cantidad: p.saldoFisico, resultado: null });
        this.cambio();
    }

    agregarTodos(): void {
        this.disponibles().forEach(p => this.agregarItem(p));
    }

    async quitarItem(itemMlId: number): Promise<void> {
        const e = this.evaluacion();
        if (!e) return;
        if (ofertasDe(e, itemMlId).length > 0) {
            const r = await this.alertService.confirm('¿Quitar el ítem?', 'También se quitarán sus precios de las cotizaciones.');
            if (!r.isConfirmed) return;
        }
        e.items = e.items.filter(i => i.itemMlId !== itemMlId);
        for (const hoja of e.cotizaciones) hoja.precios = hoja.precios.filter(p => p.itemMlId !== itemMlId);
        this.cambio();
        this.cdr.markForCheck();
    }

    programado(itemMlId: number): NoObjecionProgrammedItem | undefined {
        return this.programados().find(p => p.id === itemMlId);
    }

    calculado(itemMlId: number): EvaluacionItemCalculado | undefined {
        return this.calculados().find(c => c.itemMlId === itemMlId);
    }

    nombre(itemMlId: number): string {
        return this.calculado(itemMlId)?.nombre ?? this.programado(itemMlId)?.nombre ?? `Ítem ${itemMlId}`;
    }

    // ---- Cotizaciones (una hoja por proveedor) ---------------------------------------------------------------------

    hoja(): EvaluacionCotizacion | undefined {
        return this.evaluacion()?.cotizaciones[this.hojaActiva()];
    }

    agregarHoja(): void {
        const e = this.evaluacion();
        if (!e) return;
        const anterior = e.cotizaciones[e.cotizaciones.length - 1];
        // La fecha suele repetirse: se propone la de la hoja anterior.
        e.cotizaciones.push({ ruc: '', fechaCotizacion: anterior?.fechaCotizacion ?? null, precios: [] });
        this.hojaActiva.set(e.cotizaciones.length - 1);
        setTimeout(() => document.getElementById('hoja-ruc')?.focus());
    }

    async quitarHoja(): Promise<void> {
        const e = this.evaluacion();
        const hoja = this.hoja();
        if (!e || !hoja) return;
        if (hoja.precios.some(p => p.precioUnitario)) {
            const r = await this.alertService.confirm('¿Quitar la hoja?', 'Se perderán sus precios.');
            if (!r.isConfirmed) return;
        }
        e.cotizaciones = e.cotizaciones.filter(c => c !== hoja);
        this.hojaActiva.set(Math.max(0, this.hojaActiva() - 1));
        this.cambio();
        this.cdr.markForCheck();
    }

    /** Al cambiar el RUC, los datos de SUNAT anteriores ya no corresponden. */
    cambioRuc(hoja: EvaluacionCotizacion, ruc: string): void {
        hoja.ruc = ruc.replace(/\D/g, '').slice(0, 11);
        hoja.verificado = undefined;
        hoja.razonSocial = null;
        hoja.estadoSunat = hoja.condicionSunat = hoja.fechaInscripcion = null;
        if (esRucValido(hoja.ruc) && !this.rucRepetido(hoja)) this.cambio();
    }

    rucRepetido(hoja: EvaluacionCotizacion): boolean {
        return !!hoja.ruc && !!this.evaluacion()?.cotizaciones.some(c => c !== hoja && c.ruc === hoja.ruc);
    }

    rucValido(ruc: string): boolean {
        return esRucValido(ruc);
    }

    precio(hoja: EvaluacionCotizacion, itemMlId: number): EvaluacionPrecio {
        return precioDe(hoja, itemMlId);
    }

    aplicarCumple(hoja: EvaluacionCotizacion, valor: boolean): void {
        for (const p of hoja.precios.filter(x => (x.precioUnitario ?? 0) > 0)) p.cumple = valor;
        this.cambio();
    }

    cambioPrecio(p: EvaluacionPrecio): void {
        if (!p.precioUnitario) p.adjudicado = false;
        this.cambio();
    }

    /** Enter pasa al siguiente precio, para transcribir sin ratón. */
    siguiente(evento: Event): void {
        evento.preventDefault();
        const campos = Array.from(document.querySelectorAll<HTMLInputElement>('[data-captura]'));
        const i = campos.indexOf(evento.target as HTMLInputElement);
        const destino = campos[i + 1];
        destino?.focus();
        destino?.select();
    }

    total(hoja: EvaluacionCotizacion): number {
        const e = this.evaluacion();
        return e ? totalHoja(e, hoja) : 0;
    }

    diferenciaPapel(hoja: EvaluacionCotizacion): number | null {
        const papel = this.totalPapel[hoja.ruc];
        return papel ? Math.round((this.total(hoja) - papel) * 100) / 100 : null;
    }

    activoYHabido(hoja: EvaluacionCotizacion): boolean {
        return activoYHabido(hoja);
    }

    // ---- Evaluación ----------------------------------------------------------------------------------------------

    ofertas(itemMlId: number) {
        const e = this.evaluacion();
        return e ? ofertasDe(e, itemMlId) : [];
    }

    elegir(itemMlId: number, ruc: string): void {
        const e = this.evaluacion();
        if (!e) return;
        adjudicar(e, itemMlId, ruc);
        const item = e.items.find(i => i.itemMlId === itemMlId);
        if (item) item.resultado = 'VALIDADO';
        this.cambio();
    }

    /** Adjudica el sugerido en los ítems que aún no tienen resultado. */
    adjudicarSugeridos(): void {
        for (const item of this.evaluacion()?.items ?? []) {
            const ruc = this.calculado(item.itemMlId)?.rucSugerido;
            if (!item.resultado && ruc) this.elegir(item.itemMlId, ruc);
        }
    }

    cambioResultado(itemMlId: number, resultado: ResultadoEvaluacion): void {
        const e = this.evaluacion();
        const item = e?.items.find(i => i.itemMlId === itemMlId);
        if (!e || !item) return;
        item.resultado = resultado;
        if (resultado === 'NO_VALIDADO') adjudicar(e, itemMlId, null);
        this.cambio();
    }

    requiereJustificarPrecio(itemMlId: number): boolean {
        const e = this.evaluacion();
        return !!e && adjudicadoNoEsElMenor(e, itemMlId);
    }

    usarTextoBase(itemMlId: number): void {
        const item = this.evaluacion()?.items.find(i => i.itemMlId === itemMlId);
        if (!item) return;
        const plan = this.propuestas()?.planNegocio;
        item.observacion = 'El proceso de adjudicación de la OA se sustenta con el Acta de Evaluación del Comité para la '
            + `Adjudicación de Bienes y Servicios${plan ? ` para el Plan de Negocios "${plan.replace(/^"|"$/g, '')}"` : ''}. `
            + 'La evaluación se realizó en base a criterios de experiencia y propuesta económica.';
        this.cambio();
    }

    // ---- Informe y envío -----------------------------------------------------------------------------------------

    informeVigente(): boolean {
        const e = this.evaluacion();
        return !!e && !this.pendienteGuardar() && e.versionInforme === e.version;
    }

    async generarInforme(): Promise<void> {
        const e = this.evaluacion();
        if (!e || !(await this.guardar())) return;
        await this.procesar(this.repo.generarInforme(e.id), blob => {
            e.versionInforme = e.version;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `informe-no-objecion-${e.id}.docx`;
            a.click();
            URL.revokeObjectURL(url);
        }, 'No se pudo generar el informe.');
    }

    seleccionarInforme(evento: Event): void {
        this.archivoInforme.set((evento.target as HTMLInputElement).files?.[0] ?? null);
    }

    puedeEnviar(): boolean {
        return this.informeVigente() && this.pendientes().length === 0 && !!this.numeroInforme.trim()
            && !!this.fechaInforme && !!this.archivoInforme() && !this.procesando();
    }

    async enviar(): Promise<void> {
        const e = this.evaluacion();
        const archivo = this.archivoInforme();
        if (!e || !archivo || !this.puedeEnviar()) return;
        const r = await this.alertService.confirm('¿Enviar a la bandeja de aprobación?', 'La evaluación ya no se podrá modificar, salvo que sea rechazada o devuelta.');
        if (!r.isConfirmed) return;
        await this.procesar(this.repo.subirInforme(archivo), async ({ fileUrl }) => {
            await this.procesar(this.repo.enviar(e.id, {
                version: e.version, numeroInforme: this.numeroInforme.trim(), fechaInforme: this.fechaInforme, ideArchivo: fileUrl
            }), res => {
                this.alertService.show('Éxito', res.mensaje || 'Evaluación enviada.', 'success');
                this.volver();
            }, 'No se pudo enviar la evaluación.');
        }, 'No se pudo subir el informe firmado.');
    }

    private async procesar<T>(peticion: Observable<T>, alTerminar: (valor: T) => void | Promise<void>, mensaje: string): Promise<void> {
        this.procesando.set(true);
        try {
            await alTerminar(await firstValueFrom(peticion));
        } catch (err) {
            this.alertService.show('Error', await this.mensajeRespuesta(err, mensaje), 'error');
        } finally {
            this.procesando.set(false);
            this.cdr.markForCheck();
        }
    }

    /** Una descarga fallida trae el error de la API dentro de un Blob. */
    private async mensajeRespuesta(err: unknown, defecto: string): Promise<string> {
        const cuerpo = (err as HttpErrorResponse)?.error;
        if (cuerpo instanceof Blob) {
            try {
                return JSON.parse(await cuerpo.text()).mensaje || defecto;
            } catch {
                return defecto;
            }
        }
        return this.mensaje(err, defecto);
    }

    private mensaje(err: unknown, defecto: string): string {
        return (err as HttpErrorResponse)?.error?.mensaje || (err instanceof Error && !(err instanceof HttpErrorResponse) ? err.message : defecto);
    }

    async volver(): Promise<void> {
        if (this.pendienteGuardar()) await this.guardar();
        this.router.navigate(['/main/ejecucion', this.convenioId], { queryParams: { tab: 'no-objeciones' } });
    }

    moneda(valor?: number | null): string {
        return formatCurrency(valor ?? 0);
    }

    estadoPill(estado: string): StatusType {
        const mapa: Record<string, StatusType> = { BORRADOR: 'Pendiente', PENDIENTE: 'Pendiente', APROBADO: 'Aprobado', RECHAZADO: 'Rechazado' };
        return mapa[estado] ?? 'Pendiente';
    }
}
