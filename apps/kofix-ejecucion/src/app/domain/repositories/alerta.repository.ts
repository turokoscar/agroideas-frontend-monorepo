import { Observable } from 'rxjs';
import { AlertaFilter, AlertaListResponse } from '../models/alerta.model';

export abstract class AlertaRepository {
    abstract getAlertas(filter?: AlertaFilter): Observable<AlertaListResponse>;
}
