import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RendicionRepository } from '../../repositories/rendicion.repository';

@Injectable({ providedIn: 'root' })
export class GetPendientesRendicionUseCase {
    constructor(private repository: RendicionRepository) {}

    execute(postulanteId: number): Observable<any[]> {
        return this.repository.getPendientes(postulanteId);
    }
}
