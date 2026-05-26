import { Component, Input, Output, EventEmitter } from '@angular/core';
import { UIButtonComponent } from '../ui-button/ui-button.component';

@Component({
  selector: 'app-ui-filter-bar',
  standalone: true,
  imports: [UIButtonComponent],
  templateUrl: './ui-filter-bar.component.html',
  styleUrls: ['./ui-filter-bar.component.sass']
})
export class UiFilterBarComponent {
  @Input() showSearch = true;
  @Input() searchLabel = 'Buscar';
  @Input() searchIcon = 'search';
  
  @Input() showAdd = false;
  @Input() addLabel = 'Nuevo';

  @Output() onSearch = new EventEmitter<void>();
  @Output() onAdd = new EventEmitter<void>();
}
