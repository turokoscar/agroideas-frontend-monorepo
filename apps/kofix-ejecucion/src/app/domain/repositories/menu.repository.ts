import { Observable } from 'rxjs';
import { MenuAgrupado, MenuItem } from '../models/menu/menu.model';
import { ResponseDto } from '@agroideas/utils';

export abstract class MenuRepository {
    abstract getMenus(): Observable<MenuAgrupado[]>;
    abstract getMenusList(): Observable<MenuItem[]>;
    abstract createMenu(menu: MenuItem): Observable<ResponseDto<MenuItem>>;
    abstract updateMenu(id: number, menu: MenuItem): Observable<ResponseDto<MenuItem>>;
    abstract deleteMenu(id: number): Observable<ResponseDto<boolean>>;
    abstract getRolesByMenuId(menuId: number): Observable<ResponseDto<string[]>>;
    abstract assignRoleToMenu(menuId: number, rol: string): Observable<ResponseDto<boolean>>;
    abstract removeRoleFromMenu(menuId: number, rol: string): Observable<ResponseDto<boolean>>;
}
