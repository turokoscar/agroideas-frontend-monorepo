import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MenuRepository } from '../../repositories/menu.repository';
import { ResponseDto } from '@agroideas/utils';

@Injectable({ providedIn: 'root' })
export class AssignMenuRoleUseCase {
    constructor(private repository: MenuRepository) {}

    execute(menuId: number, rol: string): Observable<ResponseDto<boolean>> {
        return this.repository.assignRoleToMenu(menuId, rol);
    }
}
