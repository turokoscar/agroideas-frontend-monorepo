import { Component, OnDestroy, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LayoutService } from './service/layout.service';
import { AppTopbarComponent, AppSidebarComponent } from './components/app.sidebar-topbar.component';

@Component({
    selector: 'app-footer',
    standalone: true,
    imports: [CommonModule],
    template: `
        <footer class="py-4 px-6 text-center text-xs text-gray-400 border-t border-gray-100 bg-white">
            <span>AGROIDEAS - MIDAGRI &copy; 2026</span>
        </footer>
    `
})
export class AppFooterComponent {}

@Component({
    selector: 'app-layout',
    standalone: true,
    imports: [CommonModule, RouterModule, AppTopbarComponent, AppSidebarComponent, AppFooterComponent],
    template: `
        <div class="min-h-screen bg-[#f9f9f9] flex">
            <app-sidebar></app-sidebar>

            @if (layoutService.state().staticMenuMobileActive) {
                <div class="fixed inset-0 bg-black/40 z-20 md:hidden"
                     (click)="closeMobileMenu()">
                </div>
            }

            <div class="flex-1 flex flex-col min-h-screen transition-all duration-300"
                 [ngClass]="{
                     'md:ml-[250px]': !layoutService.isMobile() && !layoutService.state().staticMenuDesktopInactive,
                     'md:ml-[72px]': !layoutService.isMobile() && layoutService.state().staticMenuDesktopInactive,
                     'ml-0': layoutService.isMobile()
                 }">
                <app-topbar></app-topbar>

                <main class="flex-1 pt-16 px-4 md:px-6 pb-6">
                    <div class="max-w-full mx-auto animate-fade-in">
                        <router-outlet></router-outlet>
                    </div>
                </main>

                <app-footer></app-footer>
            </div>
        </div>
    `,
    styles: [`
        .animate-fade-in {
            animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `]
})
export class AppLayoutComponent implements OnDestroy {
    public layoutService = inject(LayoutService);

    ngOnDestroy(): void {
    }

    closeMobileMenu(): void {
        this.layoutService.state.update(prev => ({ ...prev, staticMenuMobileActive: false }));
    }
}