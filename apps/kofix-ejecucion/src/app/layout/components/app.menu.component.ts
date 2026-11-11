import { Component, OnInit, inject, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenuStateService } from '../../shared/services/menu-state.service';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [RouterModule],
    template: `
        <nav class="py-3 space-y-1" [class.px-3]="!colapsado()" [class.px-2]="colapsado()">
            @for (menu of menus(); track menu.id) {
                @if (menu.hijos && menu.hijos.length > 0) {
                    <div class="mb-4">
                        @if (!colapsado()) {
                            <div class="px-3 py-2 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest">
                                {{ menu.nombre }}
                            </div>
                        }
                        @for (child of menu.hijos; track child.id) {
                            <a [routerLink]="child.ruta"
                                routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                class="flex items-center gap-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all mb-1"
                                [class.px-3]="!colapsado()"
                                [class.px-2]="colapsado()"
                                [class.justify-center]="colapsado()"
                                [title]="colapsado() ? child.nombre : ''">
                                <span class="material-symbols-outlined text-lg shrink-0">{{ child.icono || 'circle' }}</span>
                                @if (!colapsado()) {
                                    <span>{{ child.nombre }}</span>
                                }
                            </a>
                        }
                    </div>
                } @else {
                    @if (menu.ruta) {
                        <a [routerLink]="menu.ruta"
                            routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            class="flex items-center gap-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all mb-1"
                            [class.px-3]="!colapsado()"
                            [class.px-2]="colapsado()"
                            [class.justify-center]="colapsado()"
                            [title]="colapsado() ? menu.nombre : ''">
                            <span class="material-symbols-outlined text-lg shrink-0">{{ menu.icono || 'circle' }}</span>
                            @if (!colapsado()) {
                                <span>{{ menu.nombre }}</span>
                            }
                        </a>
                    }
                }
            }
        </nav>
    `
})
export class AppMenuComponent implements OnInit {
    /** Menús compartidos con `menuGuard`: se piden a la API una sola vez. */
    private readonly menuState = inject(MenuStateService);

    /** Oculta las etiquetas de texto cuando el sidebar está colapsado a solo-íconos. */
    readonly colapsado = input(false);

    readonly menus = this.menuState.menus;

    ngOnInit(): void {
        this.loadMenus();
    }

    loadMenus(): void {
        this.menuState.asegurarCargados().subscribe();
    }
}
