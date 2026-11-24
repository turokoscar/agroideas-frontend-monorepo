import { AlertService } from '@agroideas/feedback';
import { PermissionService } from '@agroideas/security';
import { UIButtonComponent, UIModalComponent, UiFileChipComponent } from '@agroideas/ui';
import { PERMISSIONS, formatCurrency } from '@agroideas/utils';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CartaHistorial, CartaNoObjecion } from '../../../domain/models/carta-no-objecion.model';
import { CartaNoObjecionRepository } from '../../../domain/repositories/carta-no-objecion.repository';

/**
 * Carta de No Objeción (API ADR-032 entrega 3): se genera en Word sin número ni fecha (los asigna el SGD) y se
 * emite al subir el PDF firmado. Las reglas las valida la API.
 */
@Component({
    selector: 'app-no-objecion-carta-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, UIModalComponent, UIButtonComponent, UiFileChipComponent],
    templateUrl: './no-objecion-carta-modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoObjecionCartaModalComponent implements OnInit {
    noObjecionId = input.required<number>();
    readOnly = input(false);
    /** Solicitudes de desembolso de la N.O.: se advierte al anular. */
    numSolicitudes = input(0);
    /** Emite true si la carta cambió de estado. */
    @Output() closed = new EventEmitter<boolean>();

    private repo = inject(CartaNoObjecionRepository);
    private alertService = inject(AlertService);
    private permissionService = inject(PermissionService);

    loading = signal(true);
    procesando = signal(false);
    carta = signal<CartaNoObjecion | null>(null);
    historial = signal<CartaHistorial[]>([]);
    private cambio = false;

    destinatario = signal('');
    cargoDestinatario = signal('');
    ubigeo = signal('');
    numero = signal('');
    fecha = signal('');
    archivo = signal<File | null>(null);
    justificacion = signal('');

    readonly puedeElaborar = computed(() => !this.readOnly()
        && this.permissionService.hasPermission(PERMISSIONS.OPERACIONES_FINANCIERAS)
        && this.carta()?.estadoNoObjecion === 'APROBADO' && this.carta()?.estado !== 'EMITIDA');
    readonly puedeAnular = computed(() => this.permissionService.hasPermission(PERMISSIONS.SUPERVISOR)
        && this.carta()?.estado === 'EMITIDA');

    /** Lo escrito difiere de lo guardado, o aún no se guardó. */
    readonly modificada = computed(() => {
        const c = this.carta();
        return !c?.id || this.destinatario().trim() !== (c.destinatario ?? '')
            || this.cargoDestinatario().trim() !== (c.cargoDestinatario ?? '') || this.ubigeo().trim() !== (c.ubigeo ?? '');
    });
    readonly datosCompletos = computed(() =>
        !!this.destinatario().trim() && !!this.cargoDestinatario().trim() && !!this.ubigeo().trim());
    readonly generada = computed(() => !!this.carta()?.fechaGenerada && !this.modificada());
    readonly puedeEmitir = computed(() => this.generada() && !!this.numero().trim() && !!this.fecha()
        && !!this.archivo() && !this.procesando());

    readonly formatCurrency = formatCurrency;

    ngOnInit(): void {
        this.cargar();
    }

    async cargar(): Promise<void> {
        try {
            const [carta, historial] = await Promise.all([
                firstValueFrom(this.repo.get(this.noObjecionId())),
                firstValueFrom(this.repo.getHistorial(this.noObjecionId()))
            ]);
            this.carta.set(carta);
            this.historial.set(historial);
            this.destinatario.set(carta.destinatario ?? '');
            this.cargoDestinatario.set(carta.cargoDestinatario ?? '');
            this.ubigeo.set(carta.ubigeo ?? '');
            this.loading.set(false);
        } catch (err) {
            this.alertService.show('Error', await this.mensaje(err, 'No se pudo obtener la carta.'), 'error');
            this.onHide();
        }
    }

    /** Guarda lo escrito, si cambió, y descarga el Word. */
    async generar(): Promise<void> {
        if (!this.datosCompletos() || this.procesando()) return;
        await this.procesar(async () => {
            if (this.modificada()) {
                await firstValueFrom(this.repo.guardar(this.noObjecionId(), {
                    destinatario: this.destinatario().trim(),
                    cargoDestinatario: this.cargoDestinatario().trim(),
                    ubigeo: this.ubigeo().trim()
                }));
                this.cambio = true;
                await this.cargar();
            }
            const blob = await firstValueFrom(this.repo.generar(this.noObjecionId()));
            this.descargarBlob(blob, `carta-no-objecion-${this.noObjecionId()}.docx`);
            await this.cargar();
        }, 'No se pudo generar la carta.');
    }

    seleccionarArchivo(evento: Event): void {
        const archivo = (evento.target as HTMLInputElement).files?.[0] ?? null;
        if (archivo && archivo.type !== 'application/pdf') {
            this.alertService.show('Formato no válido', 'Solo se permiten archivos PDF.', 'warning');
            return;
        }
        this.archivo.set(archivo);
    }

    async emitir(): Promise<void> {
        const archivo = this.archivo();
        if (!archivo || !this.puedeEmitir()) return;
        const r = await this.alertService.confirm('¿Emitir la carta?', 'La carta emitida no se puede modificar; solo un supervisor puede anularla.');
        if (!r.isConfirmed) return;
        await this.procesar(async () => {
            const { fileUrl } = await firstValueFrom(this.repo.subir(archivo));
            const res = await firstValueFrom(this.repo.emitir(this.noObjecionId(), {
                numero: this.numero().trim(), fecha: this.fecha(), ideArchivo: fileUrl
            }));
            this.alertService.show('Éxito', res.mensaje || 'Carta emitida.', 'success');
            this.onHide(true);
        }, 'No se pudo emitir la carta.');
    }

    async anular(): Promise<void> {
        const justificacion = this.justificacion().trim();
        if (!justificacion || this.procesando()) return;
        const advertencia = this.numSolicitudes() > 0
            ? `La No Objeción tiene ${this.numSolicitudes()} solicitud(es) de desembolso, que continúan. `
            : '';
        const r = await this.alertService.confirm('¿Anular la carta?', `${advertencia}La carta quedará en el historial con su PDF.`);
        if (!r.isConfirmed) return;
        await this.procesar(async () => {
            const res = await firstValueFrom(this.repo.anular(this.noObjecionId(), justificacion));
            this.alertService.show('Éxito', res.mensaje || 'Carta anulada.', 'success');
            this.onHide(true);
        }, 'No se pudo anular la carta.');
    }

    async descargar(carta: CartaHistorial): Promise<void> {
        const id = carta.ideArchivo;
        if (!id) return;
        await this.procesar(async () => {
            this.descargarBlob(await firstValueFrom(this.repo.descargar(id)),
                `carta-${carta.numero ?? carta.id}.pdf`.replace(/[\\/:*?"<>|]/g, '-'));
        }, 'No se pudo descargar la carta.');
    }

    onHide(refresh = false): void {
        this.closed.emit(refresh || this.cambio);
    }

    private descargarBlob(blob: Blob, nombre: string): void {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        a.click();
        URL.revokeObjectURL(url);
    }

    private async procesar(tarea: () => Promise<void>, defecto: string): Promise<void> {
        this.procesando.set(true);
        try {
            await tarea();
        } catch (err) {
            this.alertService.show('Error', await this.mensaje(err, defecto), 'error');
        } finally {
            this.procesando.set(false);
        }
    }

    /** Una descarga fallida trae el error de la API dentro de un Blob. */
    private async mensaje(err: unknown, defecto: string): Promise<string> {
        const cuerpo = (err as HttpErrorResponse)?.error;
        if (!(cuerpo instanceof Blob)) return cuerpo?.mensaje || defecto;
        try {
            return JSON.parse(await cuerpo.text()).mensaje || defecto;
        } catch {
            return defecto;
        }
    }
}
