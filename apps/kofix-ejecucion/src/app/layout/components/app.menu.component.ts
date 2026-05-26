import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LayoutService } from '../service/layout.service';
import { MenuRepository } from '../../domain/repositories/menu.repository';
import { MenuAgrupado } from '../../domain/models/menu/menu.model';
import { AuthRepository } from '../../domain/repositories/auth.repository';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
        <div class="flex flex-col h-full bg-[#008F49] overflow-hidden">
            <div class="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                        <span class="material-symbols-outlined text-xl text-white">eco</span>
                    </div>
                    @if (!collapsed()) {
                        <div>
                            <span class="font-bold text-lg text-white tracking-tight">KOFIX</span>
                            <p class="text-xs text-white/60">Sistema Kardex</p>
                        </div>
                    }
                </div>
                <button (click)="toggleCollapse()" class="p-1.5 rounded-md hover:bg-white/10 transition-colors shrink-0">
                    <span class="material-symbols-outlined text-white/70">{{ collapsed() ? 'chevron_right' : 'chevron_left' }}</span>
                </button>
            </div>

            <nav class="flex-1 py-4 overflow-y-auto scrollbar-thin">
                @for (menu of menus(); track menu.id) {
                    @if (menu.hijos && menu.hijos.length > 0) {
                        <div class="mb-4">
                            @if (!collapsed()) {
                                <div class="px-4 py-2 text-[10px] font-semibold text-white/40 uppercase tracking-widest">
                                    {{ menu.nombre }}
                                </div>
                            }
                            @for (child of menu.hijos; track child.id) {
                                <a [routerLink]="child.ruta"
                                    routerLinkActive="bg-white/15 text-white font-medium"
                                    class="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:bg-white/10 hover:text-white/90 transition-all duration-200 cursor-pointer no-underline mb-1"
                                    [title]="collapsed() ? child.nombre : ''">
                                    <span class="material-symbols-outlined text-lg shrink-0">{{ child.icono || 'circle' }}</span>
                                    @if (!collapsed()) {
                                        <span>{{ child.nombre }}</span>
                                    }
                                </a>
                            }
                        </div>
                    } @else {
                        @if (menu.ruta) {
                            <a [routerLink]="menu.ruta"
                                routerLinkActive="bg-white/15 text-white font-medium"
                                class="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:bg-white/10 hover:text-white/90 transition-all duration-200 cursor-pointer no-underline mb-1"
                                [title]="collapsed() ? menu.nombre : ''">
                                <span class="material-symbols-outlined text-lg shrink-0">{{ menu.icono || 'circle' }}</span>
                                @if (!collapsed()) {
                                    <span>{{ menu.nombre }}</span>
                                }
                            </a>
                        }
                    }
                }
            </nav>

            <div class="p-4 border-t border-white/10 shrink-0">
                @if (user()) {
                    <div class="flex items-center gap-3 mb-4 px-2">
                        <div class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                            <span class="text-sm font-medium text-white">{{ user()?.name?.charAt(0) || 'U' }}</span>
                        </div>
                        @if (!collapsed()) {
                            <div class="min-w-0">
                                <p class="text-sm font-medium text-white truncate">{{ user()?.name }}</p>
                                <p class="text-xs text-white/50 truncate">{{ user()?.roles?.[0] }}</p>
                            </div>
                        }
                    </div>
                }
                <button (click)="logout()"
                    class="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-white/60 hover:bg-white/10 hover:text-white transition-all duration-200">
                    <span class="material-symbols-outlined text-lg">logout</span>
                    @if (!collapsed()) {
                        <span>Cerrar sesión</span>
                    }
                </button>
            </div>
        </div>
    `,
    styles: [`
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
    `]
})
export class AppMenuComponent implements OnInit {
    private menuRepository = inject(MenuRepository);
    private authRepository = inject(AuthRepository);
    private layoutService = inject(LayoutService);

    menus = signal<MenuAgrupado[]>([]);
    user = this.authRepository.user$;
    collapsed = signal(false);

    ngOnInit(): void {
        this.loadMenus();
        this.collapsed.set(this.layoutService.state().staticMenuDesktopInactive);
    }

    loadMenus(): void {
        this.menuRepository.getMenus().subscribe({
            next: (menus) => this.menus.set(menus),
            error: (err) => console.error('Error loading menus:', err)
        });
    }

    toggleCollapse(): void {
        const newValue = !this.collapsed();
        this.collapsed.set(newValue);
        this.layoutService.state.update(prev => ({ ...prev, staticMenuDesktopInactive: newValue }));
    }

    logout(): void {
        this.authRepository.logout();
    }
}