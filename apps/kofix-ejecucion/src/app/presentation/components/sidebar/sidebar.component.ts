import { Component, Input, Output, EventEmitter } from '@angular/core';

import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [RouterModule],
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.sass']
})

export class SidebarComponent {
    @Input() isOpen = true;
    @Input() menuItems: any[] = [];
    @Input() statusSummary: any[] = [];
}
