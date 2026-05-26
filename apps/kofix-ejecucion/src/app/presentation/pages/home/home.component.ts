import { Component } from '@angular/core';

import { UICardComponent } from '../../../shared/components/ui-card/ui-card.component';
import { UIButtonComponent } from '../../../shared/components/ui-button/ui-button.component';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [UICardComponent, UIButtonComponent],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.sass']
})
export class HomeComponent { }
