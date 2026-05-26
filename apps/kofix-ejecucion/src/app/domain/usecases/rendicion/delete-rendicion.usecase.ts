import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RendicionRepository } from '../../repositories/rendicion.repository';

@Injectable({ providedIn: 'root' })
export class DeleteRendicionUseCase {
    constructor(private repository: RendicionRepository) {}

    execute(id: number): Observable<any> {
        return this.repository.delete(id);
    }
}
