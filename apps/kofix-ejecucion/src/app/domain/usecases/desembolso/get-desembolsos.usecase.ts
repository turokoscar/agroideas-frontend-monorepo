import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DesembolsoRepository } from '../../repositories/desembolso.repository';
import { Desembolso } from '../../models/desembolso.model';

@Injectable({ providedIn: 'root' })
export class GetDesembolsosByConvenioUseCase {
    constructor(private repository: DesembolsoRepository) { }

    execute(convenioId: number, numero?: string, tipoPagoId?: number, fechaInicio?: string, fechaFin?: string, offset = 0, limit = 10): Observable<{ items: Desembolso[], total: number }> {
        return this.repository.getByPostulante(convenioId, numero, tipoPagoId, fechaInicio, fechaFin, offset, limit);
    }
}
