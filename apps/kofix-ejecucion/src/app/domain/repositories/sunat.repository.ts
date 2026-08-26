import { Observable } from 'rxjs';
import { ConsultaRuc } from '../models/sunat.model';

export abstract class SunatRepository {
    abstract consultarRuc(ruc: string): Observable<ConsultaRuc>;
}
