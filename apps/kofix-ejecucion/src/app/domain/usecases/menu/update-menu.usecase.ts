import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MenuRepository } from '../../repositories/menu.repository';
import { MenuItem } from '../../models/menu/menu.model';
import { ResponseDto } from '@agroideas/utils';

@Injectable({ providedIn: 'root' })
export class UpdateMenuUseCase {
    constructor(private repository: MenuRepository) {}

    execute(id: number, menu: MenuItem): Observable<ResponseDto<MenuItem>> {
        return this.repository.updateMenu(id, menu);
    }
}
