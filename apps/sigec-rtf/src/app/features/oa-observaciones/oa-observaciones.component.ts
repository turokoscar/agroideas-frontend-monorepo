import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RtfService } from '../../core/services/rtf.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-oa-observaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oa-observaciones.component.html'
})
export class OaObservacionesComponent {
  rtfService = inject(RtfService);
  router = inject(Router);

  fileName: string | null = null;

  onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
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
    // Reset status to Sent to represent re-submission of observations
    this.rtfService.rtfStatus.set('Enviado');
    this.router.navigate(['/rtf/dashboard']);
  }
}
