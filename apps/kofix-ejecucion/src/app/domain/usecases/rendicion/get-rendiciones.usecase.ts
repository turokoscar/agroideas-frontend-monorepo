import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RendicionRepository } from '../../repositories/rendicion.repository';
import { RendicionListResponse } from '../../models/rendicion.model';

@Injectable({ providedIn: 'root' })
export class GetRendicionesByConvenioUseCase {
    constructor(private repository: RendicionRepository) {}

    execute(postulanteId: number, offset = 0, limit = 10, sunatCpeId?: number, numeroSolicitud?: string): Observable<RendicionListResponse> {
        return this.repository.getByConvenio(postulanteId, offset, limit, sunatCpeId, numeroSolicitud);
    }
}
