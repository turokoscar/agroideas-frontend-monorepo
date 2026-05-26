import { Component, ElementRef, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LayoutService } from '../service/layout.service';
import { AuthRepository } from '../../domain/repositories/auth.repository';
import { AppMenuComponent } from './app.menu.component';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
        <header class="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 z-40 flex items-center justify-between px-4 md:px-6">
            <div class="flex items-center gap-3">
                <button class="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors md:hidden flex items-center justify-center" (click)="layoutService.onMenuToggle()">
                    <span class="material-symbols-outlined text-gray-600">menu</span>
                </button>
                
                <!-- Logo o Título en Móvil -->
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center md:hidden">
                        <span class="text-white font-black text-lg italic">K</span>
                    </div>
                    <h1 class="text-sm font-black text-slate-800 tracking-tight hidden sm:block md:hidden">KOFIX</h1>
                </div>

                <div class="hidden md:flex flex-1 max-w-md">
                    <div class="relative w-full">
                        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                        <input type="text" placeholder="Buscar..." class="w-full h-10 pl-10 pr-4 rounded-lg bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-gray-400">
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-1">
                <button class="p-2 rounded-lg hover:bg-gray-100 transition-colors hidden sm:flex">
                    <span class="material-symbols-outlined text-gray-500 text-xl">calendar_month</span>
                </button>
                
                <button class="p-2 rounded-lg hover:bg-gray-100 transition-colors relative">
                    <span class="material-symbols-outlined text-gray-500 text-xl">notifications</span>
                    <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                <div class="relative">
                    <button class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors ml-1" (click)="toggleProfile()">
                        <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm">
                            <span class="text-white text-xs font-bold">{{ initial() }}</span>
                        </div>
                        <div class="hidden sm:flex flex-col items-start -space-y-1">
                            <span class="text-xs font-bold text-gray-700">{{ userName() }}</span>
                            <span class="text-[9px] font-black uppercase text-gray-400 tracking-tighter">{{ userRole() }}</span>
                        </div>
                        <span class="material-symbols-outlined text-gray-400 text-lg hidden sm:block">expand_more</span>
                    </button>

                    @if (profileOpen()) {
                        <div class="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-fade-in z-50">
                            <div class="px-4 py-3 border-b border-gray-50">
                                <p class="text-sm font-medium text-gray-900">{{ userName() }}</p>
                                <p class="text-xs text-gray-500">{{ userRole() }}</p>
                            </div>
                            <div class="py-1">
                                <button class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                                    <span class="material-symbols-outlined text-lg">person</span>
                                    Mi Perfil
                                </button>
                                <button class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                                    <span class="material-symbols-outlined text-lg">settings</span>
                                    Configuración
                                </button>
                            </div>
                            <div class="border-t border-gray-50 pt-1">
                                <button (click)="logout()" class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                    <span class="material-symbols-outlined text-lg">logout</span>
                                    Cerrar Sesión
                                </button>
                            </div>
                        </div>
                    }
                </div>
            </div>
        </header>
    `,
    styles: [`
        .animate-fade-in {
            animation: fadeIn 0.15s ease-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `]
})
export class AppTopbarComponent implements OnInit {
    public layoutService = inject(LayoutService);
    private authRepository = inject(AuthRepository);

    profileOpen = signal(false);
    userName = signal('Usuario');
    userRole = signal('Especialista');
    initial = signal('U');

    ngOnInit(): void {
        const user = this.authRepository.user$();
        if (user) {
            this.userName.set(user.name || 'Usuario');
            this.userRole.set(user.roles?.[0] || 'Especialista');
            this.initial.set((user.name || 'U').charAt(0).toUpperCase());
        }
    }

    toggleProfile(): void {
        this.profileOpen.update(v => !v);
    }

    logout(): void {
        this.authRepository.logout();
    }
}

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, RouterModule, AppMenuComponent],
    template: `
        <aside class="fixed top-16 md:top-16 left-0 h-[calc(100vh-4rem)] z-30 transition-all duration-300 shadow-xl md:shadow-none border-r border-gray-50 bg-white"
               [ngClass]="{
                   'w-[250px]': !layoutService.isMobile() && !layoutService.state().staticMenuDesktopInactive,
                   'w-[72px]': !layoutService.isMobile() && layoutService.state().staticMenuDesktopInactive,
                   'w-[280px] translate-x-0': layoutService.isMobile() && layoutService.state().staticMenuMobileActive,
                   '-translate-x-full': layoutService.isMobile() && !layoutService.state().staticMenuMobileActive,
                   'translate-x-0': !layoutService.isMobile()
               }">
            <app-menu></app-menu>
        </aside>
    `
})
export class AppSidebarComponent implements OnInit {
    public layoutService = inject(LayoutService);
    public el = inject(ElementRef);

    isCollapsed = signal(false);
    isMobileOpen = signal(false);

    ngOnInit(): void {
        this.isCollapsed.set(this.layoutService.state().staticMenuDesktopInactive);
        this.isMobileOpen.set(this.layoutService.state().staticMenuMobileActive);

        this.layoutService.overlayOpen$.subscribe(() => {
            this.isMobileOpen.set(this.layoutService.state().staticMenuMobileActive);
        });
    }
}