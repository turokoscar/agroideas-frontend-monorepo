import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { NoObjecionRepository } from '../../repositories/no-objecion.repository';
import { NoObjecion } from '../../models/no-objecion.model';

@Injectable({ providedIn: 'root' })
export class GetNoObjecionesByConvenioUseCase {
    constructor(private repository: NoObjecionRepository) { }

    execute(convenioId: number, offset = 0, limit = 10, numero?: string, fechaInicio?: string, fechaFin?: string): Observable<{ items: NoObjecion[], total: number }> {
        return this.repository.getByPostulante(convenioId, offset, limit, numero, fechaInicio, fechaFin);
    }
}
