import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProgramacionRepository } from '../../repositories/programacion.repository';
import { ProgramacionListResponse } from '../../models/programacion.model';

@Injectable({ providedIn: 'root' })
export class GetProgramacionResumenUseCase {
    constructor(private repository: ProgramacionRepository) { }

    execute(page: number, pageSize: number, search: string, estado: string): Observable<ProgramacionListResponse> {
        return this.repository.getResumen(page, pageSize, search, estado);
    }
}