import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RtfService } from '../../core/services/rtf.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-oa-enviar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oa-enviar.component.html'
})
export class OaEnviarComponent {
  rtfService = inject(RtfService);
  router = inject(Router);

  fileName: string | null = null;

  onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file && file.type === 'application/pdf') {
      this.fileName = file.name;
    }
  }

  removeFile() {
    this.fileName = null;
  }

  onCancel() {
    this.router.navigate(['/rtf/dashboard']);
  }

  onSubmit() {
    if (this.fileName) {
      const rtfId = this.rtfService.rtfId();
      if (rtfId) {
        this.rtfService.enviarRtf(rtfId).subscribe({
          next: () => {
            this.router.navigate(['/rtf/dashboard']);
          },
          error: (err) => {
            console.error('Error al enviar RTF', err);
          }
        });
      } else {
        this.rtfService.rtfStatus.set('Enviado');
        this.router.navigate(['/rtf/dashboard']);
      }
    }
  }
}
