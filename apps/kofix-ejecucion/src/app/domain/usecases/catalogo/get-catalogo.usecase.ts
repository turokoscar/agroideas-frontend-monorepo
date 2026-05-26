import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CatalogoRepository } from '../../repositories/catalogo.repository';
import { CatalogoItem } from '../../models/catalogo.model';

@Injectable({ providedIn: 'root' })
export class GetCatalogoUseCase {
    constructor(private repository: CatalogoRepository) { }

    execute(grupo: string): Observable<CatalogoItem[]> {
        return this.repository.getByGrupo(grupo);
    }
}
