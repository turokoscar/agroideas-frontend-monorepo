import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CatalogoRepository } from '../../domain/repositories/catalogo.repository';
import { CatalogoItem } from '../../domain/models/catalogo.model';
import { ResponseDto } from '../../domain/models/response-dto.model';

@Injectable({
    providedIn: 'root'
})
export class CatalogoRepositoryImpl extends CatalogoRepository {
    private apiUrl = `${environment.apiEjecucion}/Catalogo`;

    constructor(private http: HttpClient) {
        super();
    }

    override getByGrupo(grupo: string): Observable<CatalogoItem[]> {
        return this.http.get<ResponseDto<any[]>>(`${this.apiUrl}/grupo/${grupo}`).pipe(
            map(res => (res.datos || []).map((dto: any) => ({
                id: dto.id,
                codigo: dto.codigo,
                descripcion: dto.descripcion,
                grupoId: grupo
            } as CatalogoItem)))
        );
    }
}
