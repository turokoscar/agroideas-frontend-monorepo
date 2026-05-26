import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MenuRepository } from '../../domain/repositories/menu.repository';
import { MenuAgrupado, MenuItem } from '../../domain/models/menu/menu.model';
import { environment } from '../../../environments/environment';
import { ResponseDto } from '../../domain/models/response-dto.model';

@Injectable({
    providedIn: 'root'
})
export class MenuRepositoryImpl implements MenuRepository {
    private http = inject(HttpClient);

    getMenus(): Observable<MenuAgrupado[]> {
        return this.http.get<ResponseDto<MenuAgrupado[]>>(`${environment.apiEjecucion}/Menu`).pipe(
            map(res => res.datos ?? [])
        );
    }

    getMenusList(): Observable<MenuItem[]> {
        return this.http.get<ResponseDto<MenuItem[]>>(`${environment.apiEjecucion}/Menu/list`).pipe(
            map(res => res.datos ?? [])
        );
    }
}
