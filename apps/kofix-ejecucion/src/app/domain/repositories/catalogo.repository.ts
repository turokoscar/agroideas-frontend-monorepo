import { Observable } from 'rxjs';
import { CatalogoItem } from '../models/catalogo.model';

export abstract class CatalogoRepository {
    abstract getByGrupo(grupo: string): Observable<CatalogoItem[]>;
}
