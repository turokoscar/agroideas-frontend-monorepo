import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConvenioRepository } from '../repositories/convenio.repository';
import { Convenio } from '../models/convenio.model';

@Injectable({ providedIn: 'root' })
export class GetConvenioByIdUseCase {
    constructor(private repository: ConvenioRepository) { }

    execute(id: number): Observable<Convenio> {
        return this.repository.getById(id);
    }
}
