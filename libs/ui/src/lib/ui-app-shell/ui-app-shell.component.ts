import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    inject,
    input,
    signal,
    viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Cáscara de layout con menú lateral responsive.
 *
 * Aporta solo el comportamiento —sidebar fijo en escritorio, off-canvas con
 * backdrop en móvil— y deja la marca, la navegación, el bloque de usuario y la
 * cabecera en manos de cada app a través de slots, para que ninguna pierda su
 * menú ni sus reglas de rol al adoptarlo.
 *
 * El colapso a solo-íconos en escritorio es opcional y lo gobierna la app
 * anfitriona: el shell solo aplica el ancho, el contenido proyectado decide
 * qué ocultar leyendo la misma señal que le pasa al input.
 *
 * Uso:
 * ```html
 * <app-ui-app-shell [colapsadoEscritorio]="menuColapsado()">
 *   <div shell-brand>…</div>
 *   <nav shell-nav>…</nav>
 *   <div shell-user>…</div>
 *   <div shell-header>…</div>
 *   <router-outlet />
 * </app-ui-app-shell>
 * ```
 */
@Component({
    selector: 'app-ui-app-shell',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '(document:keydown.escape)': 'cerrarMenu()'
    },
    template: `
        <div class="flex h-screen bg-background text-foreground font-sans overflow-hidden">
            <!-- Fondo oscuro: solo en móvil y con el menú desplegado -->
            @if (menuAbierto()) {
                <div
                    class="fixed inset-0 z-30 bg-black/50 md:hidden"
                    aria-hidden="true"
                    (click)="cerrarMenu()"
                ></div>
            }

            <aside
                id="ui-app-shell-menu"
                class="fixed inset-y-0 left-0 z-40 w-64 flex flex-col justify-between shrink-0
                       bg-sidebar text-sidebar-foreground border-r border-sidebar-border
                       transition-[transform,width] duration-200 ease-out motion-reduce:transition-none
                       md:static md:translate-x-0"
                [class.translate-x-0]="menuAbierto()"
                [class.-translate-x-full]="!menuAbierto()"
                [class.md:w-[72px]]="colapsadoEscritorio()"
                [class.md:w-64]="!colapsadoEscritorio()"
                [attr.aria-hidden]="esMovil() && !menuAbierto() ? 'true' : null"
            >
                <div class="min-h-0 flex-1 overflow-y-auto">
                    <div
                        class="h-16 px-5 flex items-center gap-3 border-b border-sidebar-border bg-sidebar-border/10 transition-[padding] duration-200"
                        [class.md:px-2]="colapsadoEscritorio()"
                    >
                        <ng-content select="[shell-brand]"></ng-content>
                    </div>
                    <ng-content select="[shell-nav]"></ng-content>
                </div>

                <div class="border-t border-sidebar-border px-4 py-4 transition-[padding] duration-200" [class.md:px-2]="colapsadoEscritorio()">
                    <ng-content select="[shell-user]"></ng-content>
                </div>
            </aside>

            <main class="flex-1 flex flex-col min-w-0 bg-background">
                <header
                    class="h-16 px-4 md:px-8 border-b border-border flex items-center gap-3 shrink-0 bg-surface-container-lowest"
                >
                    <button
                        #botonMenu
                        type="button"
                        class="md:hidden -ml-1 p-2 rounded-lg text-foreground hover:bg-surface-container transition-colors"
                        [attr.aria-expanded]="menuAbierto()"
                        [attr.aria-label]="menuAbierto() ? 'Cerrar menú' : 'Abrir menú'"
                        aria-controls="ui-app-shell-menu"
                        (click)="alternarMenu()"
                    >
                        <span class="material-symbols-outlined text-[22px]">
                            {{ menuAbierto() ? 'close' : 'menu' }}
                        </span>
                    </button>

                    <div class="flex flex-1 items-center justify-between gap-4 min-w-0">
                        <ng-content select="[shell-header]"></ng-content>
                    </div>
                </header>

                <div class="flex-1 overflow-y-auto p-4 md:p-8">
                    <ng-content></ng-content>
                </div>
            </main>
        </div>
    `
})
export class UiAppShellComponent {
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly botonMenu = viewChild<ElementRef<HTMLButtonElement>>('botonMenu');

    /** Colapsa el sidebar a solo-íconos en escritorio. La app dueña del estado decide cuándo. */
    readonly colapsadoEscritorio = input(false);

    private readonly _menuAbierto = signal(false);
    private readonly _esMovil = signal(false);

    readonly menuAbierto = this._menuAbierto.asReadonly();
    readonly esMovil = this._esMovil.asReadonly();

    constructor() {
        this.observarAncho();

        // Al navegar, el menú móvil debe cerrarse: si no, tapa la pantalla recién abierta.
        this.router.events
            .pipe(
                filter((evento) => evento instanceof NavigationEnd),
                takeUntilDestroyed()
            )
            .subscribe(() => this._menuAbierto.set(false));
    }

    alternarMenu(): void {
        this._menuAbierto.update((abierto) => !abierto);
    }

    cerrarMenu(): void {
        if (!this._menuAbierto()) return;

        this._menuAbierto.set(false);
        // Devuelve el foco al disparador, que es de donde salió.
        this.botonMenu()?.nativeElement.focus();
    }

    private observarAncho(): void {
        if (typeof window === 'undefined' || !window.matchMedia) return;

        // `md` de Tailwind: por debajo de 768px el menú pasa a off-canvas.
        const consulta = window.matchMedia('(max-width: 767px)');
        const alCambiar = (evento: MediaQueryList | MediaQueryListEvent) => {
            this._esMovil.set(evento.matches);
            // En escritorio el aside es estático; dejarlo "abierto" no tiene sentido.
            if (!evento.matches) this._menuAbierto.set(false);
        };

        alCambiar(consulta);
        consulta.addEventListener('change', alCambiar);
        this.destroyRef.onDestroy(() => consulta.removeEventListener('change', alCambiar));
    }
}
