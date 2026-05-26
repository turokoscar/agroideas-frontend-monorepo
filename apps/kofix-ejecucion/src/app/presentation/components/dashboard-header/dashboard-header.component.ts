import { Component, Input, Output, EventEmitter } from '@angular/core';

import { User } from '../../../domain/models/auth/auth.model';
import { UIButtonComponent } from '../../../shared/components/ui-button/ui-button.component';

@Component({
    selector: 'app-dashboard-header',
    standalone: true,
    imports: [UIButtonComponent],
    templateUrl: './dashboard-header.component.html',
    styleUrls: ['./dashboard-header.component.sass']
})
export class DashboardHeaderComponent {
    @Input() user: User | null = null;
    @Output() onToggleSidebar = new EventEmitter<void>();
    @Output() onLogout = new EventEmitter<void>();
}
