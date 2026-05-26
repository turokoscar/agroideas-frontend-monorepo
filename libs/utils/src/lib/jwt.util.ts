/**
 * Utilidades puras para decodificar JSON Web Tokens en el cliente.
 *
 * Única fuente de verdad para leer el payload de un JWT: decodificación
 * base64url segura para UTF-8, extracción de roles y manejo de expiración.
 * No depende de Angular, por lo que se prueba sin TestBed.
 *
 * Nota: estas funciones NO verifican la firma del token; solo leen su
 * contenido. La validación de la firma es responsabilidad del backend.
 */

/** Claims conocidos del JWT emitido por `sel-api-seguridad`, más claims dinámicos. */
export interface JwtPayload {
    readonly exp?: number;
    readonly email?: string;
    readonly given_name?: string;
    readonly unique_name?: string;
    readonly name?: string;
    readonly [claim: string]: unknown;
}

/**
 * Variantes de claim donde puede venir el rol, en orden de búsqueda.
 * Es el superconjunto de las tres implementaciones previas, por lo que
 * ningún consumidor pierde cobertura al migrar.
 */
const ROLE_CLAIM_KEYS = [
    'role',
    'roles',
    'Role',
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
] as const;

/**
 * Decodifica el payload de un JWT. Devuelve `null` si el token es nulo,
 * está mal formado o no es decodificable (nunca lanza).
 */
export function decodeJwt(token: string | null | undefined): JwtPayload | null {
    if (!token) return null;
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;

        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );

        return JSON.parse(jsonPayload) as JwtPayload;
    } catch {
        return null;
    }
}

/**
 * Extrae los roles del payload buscando en todas las variantes de claim
 * conocidas y deduplicando el resultado.
 */
export function extractRoles(payload: JwtPayload | null): string[] {
    if (!payload) return [];

    const roles: string[] = [];
    for (const key of ROLE_CLAIM_KEYS) {
        const claim = payload[key];
        if (Array.isArray(claim)) {
            roles.push(...claim.filter((r): r is string => typeof r === 'string'));
        } else if (typeof claim === 'string') {
            roles.push(claim);
        }
    }

    return [...new Set(roles)];
}

/** Devuelve el `exp` (epoch en segundos) del payload, o `null` si no existe. */
export function getExpiration(payload: JwtPayload | null): number | null {
    return typeof payload?.exp === 'number' ? payload.exp : null;
}

/**
 * Indica si el token está expirado. Se considera expirado cuando no tiene
 * `exp`. `now` (en milisegundos) es inyectable para facilitar las pruebas.
 */
export function isExpired(payload: JwtPayload | null, now: number = Date.now()): boolean {
    const exp = getExpiration(payload);
    if (exp === null) return true;
    return now / 1000 > exp;
}
