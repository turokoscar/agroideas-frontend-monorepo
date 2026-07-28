import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { SharedModule } from 'primeng/api';

@Component({
  selector: 'lib-ui-select-search',
  standalone: true,
  imports: [CommonModule, DropdownModule, SharedModule, FormsModule, ReactiveFormsModule],
  templateUrl: './ui-select-search.component.html',
  styleUrl: './ui-select-search.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiSelectSearchComponent),
      multi: true
    }
  ]
})
export class UiSelectSearchComponent implements ControlValueAccessor {
  @Input() options: any[] = [];
  @Input() optionLabel = 'label';
  @Input() optionValue = 'value';
  @Input() placeholder = 'Seleccionar';
  @Input() filterPlaceholder = 'Buscar y presionar Enter...';
  @Input() showClear = false;
  @Input() styleClass = '';
  @Input() emptyMessage = 'Escriba y presione Enter para buscar...';
  @Input() loading = false;

  @Output() filterChange = new EventEmitter<string>();

  value: any = null;
  disabled = false;

  onChange = (val: any) => {};
  onTouched = () => {};

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onValueChange(event: any): void {
    this.value = event.value;
    this.onChange(this.value);
    this.onTouched();
  }

  onSearch(termino: string): void {
    this.filterChange.emit(termino);
  }
}
