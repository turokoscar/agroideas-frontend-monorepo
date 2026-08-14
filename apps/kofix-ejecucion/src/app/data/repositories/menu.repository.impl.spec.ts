import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MenuRepositoryImpl } from './menu.repository.impl';
import { environment } from '../../../environments/environment';

describe('MenuRepositoryImpl', () => {
    let service: MenuRepositoryImpl;
    let httpMock: HttpTestingController;
    const baseUrl = `${environment.apiEjecucion}/menus`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [MenuRepositoryImpl]
        });
        service = TestBed.inject(MenuRepositoryImpl);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should default getMenus to an empty array when there is no datos', (done) => {
        service.getMenus().subscribe((menus) => {
            expect(menus).toEqual([]);
            done();
        });

        httpMock.expectOne(baseUrl).flush({});
    });

    it('should default getMenusList to an empty array when there is no datos', (done) => {
        service.getMenusList().subscribe((menus) => {
            expect(menus).toEqual([]);
            done();
        });

        httpMock.expectOne(`${baseUrl}/list`).flush({});
    });

    it('should create a menu with a plain POST of the menu object', () => {
        const menu = { id: 0, nombre: 'Reportes', orden: 1 };
        service.createMenu(menu).subscribe();

        const req = httpMock.expectOne(baseUrl);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(menu);
        req.flush({ respuesta: 'OK' });
    });

    it('should send the role as a JSON-encoded string body when assigning it to a menu', () => {
        service.assignRoleToMenu(7, 'ADMIN').subscribe();

        const req = httpMock.expectOne(`${baseUrl}/7/roles`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toBe(JSON.stringify('ADMIN'));
        expect(req.request.headers.get('Content-Type')).toBe('application/json');
        req.flush({ respuesta: 'OK' });
    });

    it('should remove a role by menuId and role in the URL path', () => {
        service.removeRoleFromMenu(7, 'ADMIN').subscribe();

        const req = httpMock.expectOne(`${baseUrl}/7/roles/ADMIN`);
        expect(req.request.method).toBe('DELETE');
        req.flush({ respuesta: 'OK' });
    });
});
