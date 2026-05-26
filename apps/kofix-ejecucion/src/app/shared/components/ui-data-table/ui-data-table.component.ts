import { Component, Input, Output, EventEmitter, ContentChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TableColumn {
    field: string;
    header: string;
    align?: 'left' | 'center' | 'right';
    type?: 'text' | 'number' | 'currency' | 'date' | 'badge' | 'custom';
    width?: string;
    sortable?: boolean;
}

export interface SortEvent {
    field: string;
    direction: 'asc' | 'desc';
}

@Component({
    selector: 'app-ui-data-table',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './ui-data-table.component.html',
    styleUrls: ['./ui-data-table.component.sass']
})
export class UiDataTableComponent {
    @Input() title?: string;
    @Input() subtitle?: string;
    @Input() icon?: string;
    @Input() columns: TableColumn[] = [];
    @Input() data: any[] = [];
    @Input() loading = false;
    @Input() paginator = true;
    @Input() rows = 10;
    @Input() totalRecords = 0;
    @Input() lazy = false;
    @Input() hasActions = false;
    @Input() emptyIcon = 'folder_off';
    @Input() emptyMessage = 'No se encontraron registros.';
    @Input() emptySubMessage = 'Intente ajustar o limpiar los filtros aplicados';
    @Input() showIndex = true;
    @Input() first = 0;
    @Input() responsiveMode: 'scroll' | 'collapse' = 'scroll';
    // TemplateRef para las acciones de cada fila (soluciona el bug de ng-content dentro de @for)
    @Input() actionsTemplate?: TemplateRef<any>;

    @Input() rowTemplate?: TemplateRef<any>;

    @Output() onLazyLoad = new EventEmitter<any>();
    @Output() onRowClick = new EventEmitter<any>();

    sortField = '';
    sortDirection: 'asc' | 'desc' = 'asc';

    get isMobile(): boolean {
        return this.responsiveMode === 'collapse';
    }

    get effectiveTotalRecords(): number {
        return this.lazy ? this.totalRecords : this.data.length;
    }

    get displayData(): any[] {
        if (this.lazy) return this.data;
        return this.data.slice(this.first, this.first + this.rows);
    }

    onSort(field: string): void {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }
    }

    onPrevPage(): void {
        if (this.first > 0) {
            this.first -= this.rows;
            this.emitLazyLoad();
        }
    }

    onNextPage(): void {
        if (this.first + this.rows < this.effectiveTotalRecords) {
            this.first += this.rows;
            this.emitLazyLoad();
        }
    }

    getCurrentPage(): number {
        return Math.floor(this.first / this.rows) + 1;
    }

    getTotalPages(): number {
        return Math.ceil(this.effectiveTotalRecords / this.rows);
    }

    getPageNumbers(): number[] {
        const total = this.getTotalPages();
        const current = this.getCurrentPage();
        const pages: number[] = [];
        const range = 2;
        for (let i = Math.max(1, current - range); i <= Math.min(total, current + range); i++) {
            pages.push(i);
        }
        return pages;
    }

    goToPage(page: number): void {
        this.first = (page - 1) * this.rows;
        this.emitLazyLoad();
    }

    minVal(a: number, b: number): number {
        return Math.min(a, b);
    }

    private emitLazyLoad(): void {
        this.onLazyLoad.emit({
            first: this.first,
            rows: this.rows
        });
    }
}