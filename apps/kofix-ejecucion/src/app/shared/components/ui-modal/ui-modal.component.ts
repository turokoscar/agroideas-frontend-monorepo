import { Component, Input, Output, EventEmitter, input, signal } from '@angular/core';

import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-ui-modal',
    standalone: true,
    imports: [ButtonModule],
    template: `
        <!-- Overlay -->
        @if (visible()) {
          <div class="modal-overlay" (click)="closable() ? onHide.emit() : null">
            <div class="modal-container" [style.maxWidth]="maxWidth()" (click)="$event.stopPropagation()">
              <!-- Header -->
              <div class="modal-header">
                <div class="modal-header-left">
                  @if (icon()) {
                    <span class="material-symbols-outlined modal-icon">{{icon()}}</span>
                  }
                  <div>
                    <h2 class="modal-title">{{title()}}</h2>
                    @if (subtitle()) {
                      <p class="modal-subtitle">{{subtitle()}}</p>
                    }
                  </div>
                </div>
                @if (closable()) {
                  <button class="modal-close-btn" (click)="onHide.emit()" type="button">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                }
              </div>
              <!-- Loading State -->
              @if (isLoading()) {
                <div class="modal-loading">
                  <span class="material-symbols-outlined modal-spinner">progress_activity</span>
                  <p>Cargando...</p>
                </div>
              }
              <!-- Body -->
              @if (!isLoading()) {
                <div class="modal-body">
                  <ng-content></ng-content>
                </div>
              }
              <!-- Footer -->
              <div class="modal-footer">
                <!-- Custom footer-start slot -->
                <div class="modal-footer-start">
                  <ng-content select="[footer-start]"></ng-content>
                </div>
                <div class="modal-footer-actions">
                  <button type="button" class="btn-cancel" (click)="onHide.emit()">
                    Cancelar
                  </button>
                  @if (showSaveButton()) {
                    <button type="button" class="btn-save"
                      [disabled]="isSubmitting() || saveDisabled()"
                      (click)="onSave.emit()">
                      @if (isSubmitting()) {
                        <span class="material-symbols-outlined btn-spinner">progress_activity</span>
                      }
                      @if (saveIcon() && !isSubmitting()) {
                        <span class="material-symbols-outlined">{{saveIcon()}}</span>
                      }
                      {{isSubmitting() ? 'Guardando...' : saveLabel()}}
                    </button>
                  }
                </div>
              </div>
            </div>
          </div>
        }
        `,
    styleUrl: './ui-modal.component.css'
})
export class UIModalComponent {
    visible = input<boolean>(false);
    title = input<string>('');
    subtitle = input<string>('');
    icon = input<string>('');
    maxWidth = input<string>('600px');
    closable = input<boolean>(true);
    isLoading = input<boolean>(false);
    isSubmitting = input<boolean>(false);
    saveLabel = input<string>('Guardar');
    saveIcon = input<string>('');
    saveDisabled = input<boolean>(false);
    showSaveButton = input<boolean>(true);

    @Output() onHide = new EventEmitter<void>();
    @Output() onSave = new EventEmitter<void>();
}
