import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RendicionRepository } from '../../repositories/rendicion.repository';
import { RendicionRequest } from '../../models/rendicion.model';

@Injectable({ providedIn: 'root' })
export class UpdateRendicionUseCase {
    constructor(private repository: RendicionRepository) {}

    execute(id: number, request: RendicionRequest): Observable<any> {
        return this.repository.update(id, request);
    }
}
