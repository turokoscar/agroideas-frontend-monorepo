import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RendicionRepository } from '../../repositories/rendicion.repository';

@Injectable({ providedIn: 'root' })
export class UploadFileUseCase {
    constructor(private repository: RendicionRepository) {}

    execute(file: File): Observable<{ fileUrl: string }> {
        return this.repository.uploadFile(file);
    }
}
