import { Directive, ElementRef, Input, inject, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { EvidenciaService } from '../services/evidencia.service';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[authImg]',
  standalone: true
})
export class AuthImgDirective implements OnChanges, OnDestroy {
  private el = inject(ElementRef);
  private service = inject(EvidenciaService);
  private subscription?: Subscription;
  private currentUrl?: string;

  @Input('authImg') imgId!: string;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['imgId'] && this.imgId) {
      this.loadImage();
    }
  }

  private loadImage() {
    this.cleanup();
    
    // Placeholder loading
    this.el.nativeElement.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%2394a3b8" font-family="sans-serif" font-size="12">Cargando...</text></svg>';

    this.subscription = this.service.descargarArchivo(this.imgId).subscribe({
      next: (blob) => {
        this.currentUrl = URL.createObjectURL(blob);
        this.el.nativeElement.src = this.currentUrl;
      },
      error: () => {
        this.el.nativeElement.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%2394a3b8" font-family="sans-serif" font-size="12">Error al cargar</text></svg>';
      }
    });
  }

  private cleanup() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
      this.currentUrl = undefined;
    }
  }

  ngOnDestroy() {
    this.cleanup();
  }
}
