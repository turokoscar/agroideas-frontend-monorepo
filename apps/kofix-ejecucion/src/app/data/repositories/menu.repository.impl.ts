import { ResponseDto } from '@agroideas/utils';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MenuRepository } from '../../domain/repositories/menu.repository';
import { MenuAgrupado, MenuItem } from '../../domain/models/menu/menu.model';
import { environment } from '../../../environments/environment';

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

    createMenu(menu: MenuItem): Observable<ResponseDto<MenuItem>> {
        return this.http.post<ResponseDto<MenuItem>>(`${environment.apiEjecucion}/Menu`, menu);
    }

    updateMenu(id: number, menu: MenuItem): Observable<ResponseDto<MenuItem>> {
        return this.http.put<ResponseDto<MenuItem>>(`${environment.apiEjecucion}/Menu/${id}`, menu);
    }

    deleteMenu(id: number): Observable<ResponseDto<boolean>> {
        return this.http.delete<ResponseDto<boolean>>(`${environment.apiEjecucion}/Menu/${id}`);
    }

    getRolesByMenuId(menuId: number): Observable<ResponseDto<string[]>> {
        return this.http.get<ResponseDto<string[]>>(`${environment.apiEjecucion}/Menu/${menuId}/roles`);
    }

    assignRoleToMenu(menuId: number, rol: string): Observable<ResponseDto<boolean>> {
        return this.http.post<ResponseDto<boolean>>(`${environment.apiEjecucion}/Menu/${menuId}/roles`, JSON.stringify(rol), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    removeRoleFromMenu(menuId: number, rol: string): Observable<ResponseDto<boolean>> {
        return this.http.delete<ResponseDto<boolean>>(`${environment.apiEjecucion}/Menu/${menuId}/roles/${rol}`);
    }
}
