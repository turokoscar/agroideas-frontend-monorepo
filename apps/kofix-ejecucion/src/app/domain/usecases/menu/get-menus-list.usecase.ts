import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MenuRepository } from '../../repositories/menu.repository';
import { MenuItem } from '../../models/menu/menu.model';

@Injectable({ providedIn: 'root' })
export class GetMenusListUseCase {
    constructor(private repository: MenuRepository) {}

    execute(): Observable<MenuItem[]> {
        return this.repository.getMenusList();
    }
}
