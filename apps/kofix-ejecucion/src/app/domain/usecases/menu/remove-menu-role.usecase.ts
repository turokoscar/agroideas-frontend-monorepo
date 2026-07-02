import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MenuRepository } from '../../repositories/menu.repository';
import { ResponseDto } from '@agroideas/utils';

@Injectable({ providedIn: 'root' })
export class RemoveMenuRoleUseCase {
    constructor(private repository: MenuRepository) {}

    execute(menuId: number, rol: string): Observable<ResponseDto<boolean>> {
        return this.repository.removeRoleFromMenu(menuId, rol);
    }
}
