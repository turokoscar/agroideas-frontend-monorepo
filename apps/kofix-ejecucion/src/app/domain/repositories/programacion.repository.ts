import { Observable } from 'rxjs';
import { ProgramacionItem, DetalleCronograma, GuardarCronogramaRequest, ProgramacionListResponse, ProgramacionBloqueoResponse } from '../models/programacion.model';

export interface ProgramacionItemsResponse {
    items: ProgramacionItem[];
    total: number;
}

export abstract class ProgramacionRepository {
    abstract getResumen(page: number, pageSize: number, search: string, estado: string): Observable<ProgramacionListResponse>;

    abstract getByPostulante(postulanteId: number, page: number, pageSize: number): Observable<ProgramacionItemsResponse>;

    abstract getCronograma(marcoLogicoId: number): Observable<DetalleCronograma[]>;

    abstract saveCronograma(request: GuardarCronogramaRequest): Observable<any>;

    abstract delete(id: number): Observable<any>;

    abstract getEstadoBloqueo(postulanteId: number): Observable<ProgramacionBloqueoResponse>;
}