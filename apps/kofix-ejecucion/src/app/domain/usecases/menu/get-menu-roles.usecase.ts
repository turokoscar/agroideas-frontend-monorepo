import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MenuRepository } from '../../repositories/menu.repository';
import { ResponseDto } from '@agroideas/utils';

@Injectable({ providedIn: 'root' })
export class GetMenuRolesUseCase {
    constructor(private repository: MenuRepository) {}

    execute(menuId: number): Observable<ResponseDto<string[]>> {
        return this.repository.getRolesByMenuId(menuId);
    }
}
