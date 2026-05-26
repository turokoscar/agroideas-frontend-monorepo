import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'ui-card',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 h-full flex flex-col"
          [ngClass]="customClass()">
        
          @if (title() || subtitle() || icon()) {
            <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <div class="flex items-center">
                @if (icon()) {
                  <div class="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center mr-3">
                    <span class="material-symbols-outlined text-primary text-xl">{{icon()}}</span>
                  </div>
                }
                <div>
                  @if (title()) {
                    <h4 class="text-sm font-black text-slate-800 uppercase tracking-tight m-0">{{title()}}</h4>
                  }
                  @if (subtitle()) {
                    <p class="text-xs font-medium text-slate-500 uppercase tracking-wider mt-0.5 mb-0">{{subtitle()}}</p>
                  }
                </div>
              </div>
              <div class="card-actions">
                <ng-content select="[header-actions]"></ng-content>
                <ng-content select="[actions]"></ng-content>
              </div>
            </div>
          }
        
          <div class="p-6 flex-1 text-slate-600 font-display">
            <ng-content></ng-content>
          </div>
        
          @if (hasFooter()) {
            <div class="px-6 py-4 bg-slate-50/50 border-t border-slate-100">
              <ng-content select="[footer]"></ng-content>
            </div>
          }
        </div>
        `
})
export class UICardComponent {
    title = input<string>('');
    subtitle = input<string>('');
    icon = input<string>('');
    customClass = input<string>('');
    hasFooter = input<boolean>(false);
}
