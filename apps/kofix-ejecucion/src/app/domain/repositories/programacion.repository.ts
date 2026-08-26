import { Observable } from 'rxjs';
import { ProgramacionItem, DetalleCronograma, GuardarCronogramaRequest, ProgramacionBloqueoResponse } from '../models/programacion.model';

export interface ProgramacionItemsResponse {
    items: ProgramacionItem[];
    total: number;
}

export abstract class ProgramacionRepository {
    abstract getByPostulante(postulanteId: number, page: number, pageSize: number): Observable<ProgramacionItemsResponse>;

    abstract getCronograma(marcoLogicoId: number): Observable<DetalleCronograma[]>;

    abstract saveCronograma(request: GuardarCronogramaRequest): Observable<any>;

    abstract delete(id: number): Observable<any>;

    abstract getEstadoBloqueo(postulanteId: number): Observable<ProgramacionBloqueoResponse>;
}