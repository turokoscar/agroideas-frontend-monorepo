import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MenuRepository } from '../../repositories/menu.repository';
import { MenuAgrupado } from '../../models/menu/menu.model';

@Injectable({ providedIn: 'root' })
export class GetMenusUseCase {
    constructor(private repository: MenuRepository) {}

    execute(): Observable<MenuAgrupado[]> {
        return this.repository.getMenus();
    }
}
