import { UIButtonComponent, UICardComponent } from '@agroideas/ui';
import { Component } from '@angular/core';


@Component({
    selector: 'app-home',
    standalone: true,
    imports: [UICardComponent, UIButtonComponent],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.sass']
})
export class HomeComponent { }
