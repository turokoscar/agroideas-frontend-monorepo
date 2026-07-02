import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MenuRepository } from '../../repositories/menu.repository';
import { ResponseDto } from '@agroideas/utils';

@Injectable({ providedIn: 'root' })
export class DeleteMenuUseCase {
    constructor(private repository: MenuRepository) {}

    execute(id: number): Observable<ResponseDto<boolean>> {
        return this.repository.deleteMenu(id);
    }
}
