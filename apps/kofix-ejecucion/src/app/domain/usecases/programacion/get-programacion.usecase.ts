import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProgramacionRepository, ProgramacionItemsResponse } from '../../repositories/programacion.repository';

@Injectable({ providedIn: 'root' })
export class GetProgramacionByConvenioUseCase {
    constructor(private repository: ProgramacionRepository) { }

    execute(postulanteId: number, page = 1, pageSize = 10): Observable<ProgramacionItemsResponse> {
        return this.repository.getByPostulante(postulanteId, page, pageSize);
    }
}
