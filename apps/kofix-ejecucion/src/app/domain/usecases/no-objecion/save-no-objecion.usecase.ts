import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { NoObjecionRepository } from '../../repositories/no-objecion.repository';
import { NoObjecion } from '../../models/no-objecion.model';

@Injectable({ providedIn: 'root' })
export class SaveNoObjecionUseCase {
    constructor(private repository: NoObjecionRepository) { }

    execute(noObjecion: NoObjecion): Observable<any> {
        if (noObjecion.id) {
            return this.repository.update(noObjecion.id, noObjecion);
        }
        return this.repository.create(noObjecion);
    }
}
