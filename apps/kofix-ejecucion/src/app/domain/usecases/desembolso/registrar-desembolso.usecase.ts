import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DesembolsoRepository } from '../../repositories/desembolso.repository';
import { Desembolso } from '../../models/desembolso.model';

@Injectable({ providedIn: 'root' })
export class RegistrarDesembolsoUseCase {
    constructor(private repository: DesembolsoRepository) { }

    execute(desembolso: Partial<Desembolso>): Observable<any> {
        return this.repository.registrar(desembolso);
    }
}
