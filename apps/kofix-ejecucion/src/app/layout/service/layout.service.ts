import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';

export interface LayoutConfig {
    ripple: boolean;
    inputStyle: string;
    menuMode: string;
    colorScheme: string;
    theme: string;
    scale: number;
}

interface LayoutState {
    staticMenuDesktopInactive: boolean;
    overlayMenuActive: boolean;
    profileSidebarVisible: boolean;
    configSidebarVisible: boolean;
    staticMenuMobileActive: boolean;
    menuHoverActive: boolean;
}

@Injectable({
    providedIn: 'root',
})
export class LayoutService {
    config = signal<LayoutConfig>({
        ripple: false,
        inputStyle: 'outlined',
        menuMode: 'static',
        colorScheme: 'light',
        theme: 'lara-light-green',
        scale: 14,
    });

    state = signal<LayoutState>({
        staticMenuDesktopInactive: false,
        overlayMenuActive: false,
        profileSidebarVisible: false,
        configSidebarVisible: false,
        staticMenuMobileActive: false,
        menuHoverActive: false,
    });

    // Reactive screen size detection
    isMobile = signal<boolean>(window.innerWidth <= 991);
    
    private configUpdate = new Subject<LayoutConfig>();
    private overlayOpen = new Subject<any>();

    configUpdate$ = this.configUpdate.asObservable();
    overlayOpen$ = this.overlayOpen.asObservable();

    constructor() {
        // Simple listener for screen changes
        const mediaQuery = window.matchMedia('(max-width: 991px)');
        const listener = (event: MediaQueryListEvent) => {
            this.isMobile.set(event.matches);
            if (!event.matches) {
                // Reset mobile menu when returning to desktop
                this.state.update(prev => ({ ...prev, staticMenuMobileActive: false }));
            }
        };
        
        mediaQuery.addEventListener('change', listener);
    }

    onMenuToggle() {
        if (this.isOverlay()) {
            this.state.update((prev) => ({ ...prev, overlayMenuActive: !prev.overlayMenuActive }));
            if (this.state().overlayMenuActive) {
                this.overlayOpen.next(null);
            }
        }

        if (this.isDesktop()) {
            this.state.update((prev) => ({ ...prev, staticMenuDesktopInactive: !prev.staticMenuDesktopInactive }));
        } else {
            this.state.update((prev) => ({ ...prev, staticMenuMobileActive: !prev.staticMenuMobileActive }));

            if (this.state().staticMenuMobileActive) {
                this.overlayOpen.next(null);
            }
        }
    }

    showProfileSidebar() {
        this.state.update((prev) => ({ ...prev, profileSidebarVisible: !prev.profileSidebarVisible }));
        if (this.state().profileSidebarVisible) {
            this.overlayOpen.next(null);
        }
    }

    showConfigSidebar() {
        this.state.update((prev) => ({ ...prev, configSidebarVisible: true }));
    }

    isOverlay() {
        return this.config().menuMode === 'overlay';
    }

    isDesktop() {
        return !this.isMobile();
    }

    onConfigUpdate() {
        this.configUpdate.next(this.config());
    }
}
