import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UiAppShellComponent } from '@agroideas/ui';
import { AuthRepository } from '../domain/repositories/auth.repository';
import { AppMenuComponent } from './components/app.menu.component';

@Component({
    selector: 'app-layout',
    standalone: true,
    imports: [RouterModule, UiAppShellComponent, AppMenuComponent],
    template: `
        <app-ui-app-shell [colapsadoEscritorio]="colapsado()">
            <div shell-brand class="flex items-center gap-3 w-full" [class.justify-center]="colapsado()">
                @if (!colapsado()) {
                    <div class="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-xl text-sidebar-primary-foreground">eco</span>
                    </div>
                    <div class="min-w-0">
                        <span class="font-bold text-lg text-sidebar-foreground tracking-tight block">KOFIX</span>
                        <p class="text-xs text-sidebar-foreground/60">Sistema Kardex</p>
                    </div>
                }
                <button type="button"
                        (click)="toggleColapso()"
                        class="hidden md:flex p-1.5 rounded-md hover:bg-sidebar-accent/30 transition-colors shrink-0"
                        [class.ml-auto]="!colapsado()"
                        [attr.aria-label]="colapsado() ? 'Expandir menú' : 'Colapsar menú'">
                    <span class="material-symbols-outlined text-sidebar-foreground/70">{{ colapsado() ? 'chevron_right' : 'chevron_left' }}</span>
                </button>
            </div>

            <app-menu shell-nav [colapsado]="colapsado()"></app-menu>

            <div shell-user>
                @if (user()) {
                    <div class="flex items-center gap-3 mb-3" [class.justify-center]="colapsado()">
                        <div class="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
                            <span class="text-sm font-medium text-sidebar-accent-foreground">{{ initial() }}</span>
                        </div>
                        @if (!colapsado()) {
                            <div class="min-w-0 flex-1">
                                <p class="text-sm font-medium text-sidebar-foreground truncate">{{ userName() }}</p>
                                <p class="text-xs text-sidebar-foreground/50 truncate">{{ userRole() }}</p>
                            </div>
                        }
                    </div>
                }
                <button type="button" (click)="logout()"
                        [title]="colapsado() ? 'Cerrar sesión' : ''"
                        class="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground transition-all duration-200"
                        [class.justify-center]="colapsado()">
                    <span class="material-symbols-outlined text-lg">logout</span>
                    @if (!colapsado()) {
                        <span>Cerrar sesión</span>
                    }
                </button>
            </div>

            <div shell-header class="flex flex-1 items-center justify-between gap-4 min-w-0">
                <div class="hidden md:flex flex-1 max-w-md">
                    <div class="relative w-full">
                        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                        <input type="text" placeholder="Buscar..." class="w-full h-10 pl-10 pr-4 rounded-lg bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-gray-400">
                    </div>
                </div>
                <button type="button" class="p-2 rounded-lg hover:bg-gray-100 transition-colors relative ml-auto" aria-label="Notificaciones">
                    <span class="material-symbols-outlined text-gray-500 text-xl">notifications</span>
                    <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>
            </div>

            <router-outlet></router-outlet>
        </app-ui-app-shell>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppLayoutComponent {
    private readonly authRepository = inject(AuthRepository);

    /** Colapso del sidebar a solo-íconos en escritorio; el shell compartido solo aplica el ancho. */
    readonly colapsado = signal(false);

    readonly user = this.authRepository.user$;
    readonly userName = computed(() => this.user()?.name || 'Usuario');
    readonly userRole = computed(() => this.user()?.roles?.[0] || 'Especialista');
    readonly initial = computed(() => (this.user()?.name || 'U').charAt(0).toUpperCase());

    toggleColapso(): void {
        this.colapsado.update((v) => !v);
    }

    logout(): void {
        this.authRepository.logout();
    }
}
