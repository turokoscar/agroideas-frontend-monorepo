import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';

import { RouterModule } from '@angular/router';
import { AuthRepository } from '../../../domain/repositories/auth.repository';
import { User } from '../../../domain/models/auth/auth.model';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { DashboardHeaderComponent } from '../../components/dashboard-header/dashboard-header.component';

@Component({
    selector: 'app-dashboard-page',
    standalone: true,
    imports: [RouterModule, SidebarComponent, DashboardHeaderComponent],
    templateUrl: './dashboard.page.html',
    styleUrls: ['./dashboard.page.sass'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent {
    private authRepository = inject(AuthRepository);

    isSidebarOpen = signal(true);
    user = this.authRepository.user$;

    menuItems = [
        { label: 'Resumen Financiero', icon: 'dashboard', link: '/main/home' },
        { label: 'Gestión de Convenios', icon: 'handshake', link: '/main/convenios' },
        { label: 'Cartera de Proyectos', icon: 'business_center', link: '/main/cartera' },
        { label: 'Programación Anual', icon: 'calendar_today', link: '/main/programacion' },
        { label: 'Kardex Financiero', icon: 'account_balance_wallet', link: '/main/kardex' },
        { label: 'Gestión de Saldos', icon: 'payments', link: '/main/saldos' },
        { label: 'Alertas de Control', icon: 'warning', link: '/main/alertas', badge: true },
        { label: 'Reportes Ejecutivos', icon: 'bar_chart', link: '/main/reportes' }
    ];

    statusSummary = [
        { label: 'En Ejecución', count: 8, percentage: 80, color: '#76BC21' }, // Verde Agro
        { label: 'Suspendidos', count: 1, percentage: 10, color: '#DA8824' },  // Marrón Tierra (Accent Orange)
        { label: 'Finalizados', count: 1, percentage: 10, color: '#ef4444' }    // Red-500
    ];


    toggleSidebar() {
        this.isSidebarOpen.update(v => !v);
    }

    logout() {
        this.authRepository.logout();
    }
}
