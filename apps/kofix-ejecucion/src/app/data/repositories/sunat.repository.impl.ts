import { ResponseDto } from '@agroideas/utils';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { SunatRepository } from '../../domain/repositories/sunat.repository';
import { ConsultaRuc } from '../../domain/models/sunat.model';

@Injectable({
    providedIn: 'root'
})
export class SunatRepositoryImpl extends SunatRepository {
    private apiUrl = `${environment.apiEjecucion}/sunat`;

    constructor(private http: HttpClient) {
        super();
    }

    override consultarRuc(ruc: string): Observable<ConsultaRuc> {
        return this.http.get<ResponseDto<ConsultaRuc>>(`${this.apiUrl}/ruc/${ruc}`).pipe(
            map(res => res.datos as ConsultaRuc)
        );
    }
}
