import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private counter = 0;
  messages = signal<ToastMessage[]>([]);

  success(title: string, description?: string, duration = 4000): void {
    this.show('success', title, description, duration);
  }

  error(title: string, description?: string, duration = 5000): void {
    this.show('error', title, description, duration);
  }

  warning(title: string, description?: string, duration = 4000): void {
    this.show('warning', title, description, duration);
  }

  info(title: string, description?: string, duration = 3000): void {
    this.show('info', title, description, duration);
  }

  private show(type: ToastType, title: string, description?: string, duration = 4000): void {
    const id = ++this.counter;
    const msg: ToastMessage = { id, type, title, description, duration };
    this.messages.update(m => [...m, msg]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  remove(id: number): void {
    this.messages.update(m => m.filter(msg => msg.id !== id));
  }

  clear(): void {
    this.messages.set([]);
  }
}
