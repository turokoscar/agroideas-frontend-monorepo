import { decodeJwt, extractRoles, getExpiration, isExpired, JwtPayload } from './jwt.util';

/** Construye un JWT de prueba (header.payload.signature) con payload UTF-8 seguro. */
function encodeToken(payload: Record<string, unknown>): string {
    const json = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    const b64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `eyJhbGciOiJIUzI1NiJ9.${b64}.signature`;
}

const URI_ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

describe('jwt.util', () => {
    describe('decodeJwt', () => {
        it('decodifica el payload de un token válido', () => {
            const token = encodeToken({ email: 'a@b.com', exp: 123 });
            expect(decodeJwt(token)).toEqual(expect.objectContaining({ email: 'a@b.com', exp: 123 }));
        });

        it('devuelve null para token nulo, vacío o undefined', () => {
            expect(decodeJwt(null)).toBeNull();
            expect(decodeJwt(undefined)).toBeNull();
            expect(decodeJwt('')).toBeNull();
        });

        it('devuelve null (sin lanzar) para tokens mal formados', () => {
            expect(decodeJwt('no-tiene-segmentos')).toBeNull();
            expect(decodeJwt('header..signature')).toBeNull();
            expect(decodeJwt('header.@@no-base64@@.sig')).toBeNull();
        });

        it('decodifica correctamente caracteres UTF-8', () => {
            const token = encodeToken({ given_name: 'José Niño' });
            expect(decodeJwt(token)?.['given_name']).toBe('José Niño');
        });
    });

    describe('extractRoles', () => {
        it('devuelve [] para payload nulo', () => {
            expect(extractRoles(null)).toEqual([]);
        });

        it('lee roles desde un array en "roles"', () => {
            expect(extractRoles({ roles: ['Jefe', 'Supervisor'] } as JwtPayload))
                .toEqual(['Jefe', 'Supervisor']);
        });

        it('lee un rol singular en "role" (caso que las versiones previas perdían)', () => {
            expect(extractRoles({ role: 'Especialista' } as JwtPayload)).toEqual(['Especialista']);
        });

        it('lee el claim URI de schemas, sea string o array', () => {
            expect(extractRoles({ [URI_ROLE_CLAIM]: 'Jefe' } as JwtPayload)).toEqual(['Jefe']);
            expect(extractRoles({ [URI_ROLE_CLAIM]: ['Jefe', 'Supervisor'] } as JwtPayload))
                .toEqual(['Jefe', 'Supervisor']);
        });

        it('deduplica roles repetidos entre distintos claims', () => {
            const payload = { role: 'Jefe', roles: ['Jefe', 'Supervisor'] } as JwtPayload;
            expect(extractRoles(payload)).toEqual(['Jefe', 'Supervisor']);
        });

        it('ignora elementos no string dentro de un array de roles', () => {
            expect(extractRoles({ roles: ['Jefe', 42, null] } as unknown as JwtPayload))
                .toEqual(['Jefe']);
        });
    });

    describe('getExpiration', () => {
        it('devuelve exp cuando es numérico', () => {
            expect(getExpiration({ exp: 1700000000 } as JwtPayload)).toBe(1700000000);
        });

        it('devuelve null cuando exp no existe o el payload es nulo', () => {
            expect(getExpiration({} as JwtPayload)).toBeNull();
            expect(getExpiration(null)).toBeNull();
        });
    });

    describe('isExpired', () => {
        const NOW_MS = 1_000_000 * 1000; // 1_000_000 s en ms

        it('es true cuando exp está en el pasado', () => {
            expect(isExpired({ exp: 999_999 } as JwtPayload, NOW_MS)).toBe(true);
        });

        it('es false cuando exp está en el futuro', () => {
            expect(isExpired({ exp: 1_000_001 } as JwtPayload, NOW_MS)).toBe(false);
        });

        it('es true cuando no hay exp o el payload es nulo', () => {
            expect(isExpired({} as JwtPayload, NOW_MS)).toBe(true);
            expect(isExpired(null, NOW_MS)).toBe(true);
        });
    });
});
