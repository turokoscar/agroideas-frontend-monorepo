import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProgramacionRepository } from '../../repositories/programacion.repository';
import { GuardarCronogramaRequest } from '../../models/programacion.model';

@Injectable({ providedIn: 'root' })
export class SaveProgramacionUseCase {
    constructor(private repository: ProgramacionRepository) { }

    execute(request: GuardarCronogramaRequest): Observable<any> {
        return this.repository.saveCronograma(request);
    }
}
