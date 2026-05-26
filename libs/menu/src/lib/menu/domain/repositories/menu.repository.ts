import { Observable } from 'rxjs';
import { MenuAgrupado, MenuItem } from '../models/menu.model';

export abstract class MenuRepository {
  abstract getMenus(): Observable<MenuAgrupado[]>;
  abstract getMenusList(): Observable<MenuItem[]>;
}
