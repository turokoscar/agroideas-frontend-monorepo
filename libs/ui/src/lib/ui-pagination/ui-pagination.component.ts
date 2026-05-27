import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ui-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-pagination.component.html',
  styleUrl: './ui-pagination.component.scss'
})
export class UiPaginationComponent {
  @Input() total = 0;
  @Input() pageSize = 20;
  @Input() currentPage = 1;
  @Input() pageLinks = 5;

  @Output() pageChange = new EventEmitter<number>();

  totalPages = computed(() => Math.max(1, Math.ceil(this.total / this.pageSize)));

  from = computed(() => (this.currentPage - 1) * this.pageSize + 1);
  to = computed(() => Math.min(this.currentPage * this.pageSize, this.total));

  pages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage;
    const range = Math.floor(this.pageLinks / 2);
    let start = Math.max(1, current - range);
    let end = Math.min(total, current + range);
    if (end - start + 1 < this.pageLinks) {
      if (start === 1) {
        end = Math.min(total, start + this.pageLinks - 1);
      } else {
        start = Math.max(1, end - this.pageLinks + 1);
      }
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage) return;
    this.pageChange.emit(page);
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.pageChange.emit(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages()) {
      this.pageChange.emit(this.currentPage + 1);
    }
  }
}
