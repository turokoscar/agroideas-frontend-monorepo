import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConvenioRepository } from '../repositories/convenio.repository';
import { Convenio } from '../models/convenio.model';

@Injectable({ providedIn: 'root' })
export class GetTodosConveniosUseCase {
    constructor(private repository: ConvenioRepository) { }

    execute(pagina: number, cantidad: number, busqueda?: string): Observable<{ datos: Convenio[], total: number }> {
        return this.repository.getTodos(pagina, cantidad, busqueda);
    }
}