/**
 * Contrato de usuario de `sel-api-seguridad` (`POST /api/Auth/login`) y su mapeo
 * a la sesión que consumen las apps.
 *
 * Única fuente de verdad de los nombres de campo que devuelve el backend: cada
 * app los mapeaba por su cuenta y ambas lo hacían mal (`name`/`paterno`/`materno`
 * en lugar de `nombres`/`apellidoPaterno`/`apellidoMaterno`), lo que pintaba
 * "undefined undefined" en el menú lateral.
 *
 * Son funciones puras, sin dependencias de Angular, por lo que se prueban sin
 * TestBed — igual que `jwt.util.ts` en `@agroideas/utils`.
 */

/** Usuario tal como lo emite `sel-api-seguridad`. */
export interface SelUsuarioDto {
    readonly id: number;
    readonly dni: string;
    readonly nombres: string;
    readonly apellidoPaterno: string;
    readonly apellidoMaterno: string | null;
    readonly email: string;
    readonly usuario: string;
    readonly telefono: string | null;
    readonly sigla: string | null;
    readonly foto: string | null;
    readonly roles: string[];
}

/** Envelope MIDAGRI del login de `sel-api-seguridad`. */
export interface SelLoginResponse {
    readonly respuesta: 'OK' | 'ERROR';
    readonly mensaje: string;
    readonly datos: {
        readonly accessToken: string;
        readonly refreshToken: string;
        readonly expiresIn: number;
        readonly user: SelUsuarioDto;
    } | null;
}

/** Datos de sesión que las apps guardan y muestran. */
export interface SesionUsuario {
    readonly id: string;
    readonly nombre: string;
    readonly iniciales: string;
    readonly usuario: string;
    readonly email: string;
    readonly sigla: string;
    readonly rol: string;
}

/** Nombre completo, ignorando los apellidos vacíos o ausentes. */
export function nombreCompleto(dto: SelUsuarioDto): string {
    return [dto.nombres, dto.apellidoPaterno, dto.apellidoMaterno]
        .filter((parte): parte is string => !!parte?.trim())
        .join(' ')
        .trim();
}

/**
 * Iniciales para el avatar: primera letra del nombre y primera del apellido
 * paterno ("ANDERSON MAXWELL" + "CUBAS" → "AC"). Sustituye al
 * `nombre.substring(0, 2)` de los shells, que devolvía "AN".
 * Se calcula sobre los campos separados porque el nombre ya concatenado no
 * permite saber dónde terminan los nombres y empiezan los apellidos.
 */
export function iniciales(dto: SelUsuarioDto): string {
    const inicial = (valor: string | null | undefined) => valor?.trim().charAt(0) ?? '';
    return `${inicial(dto.nombres)}${inicial(dto.apellidoPaterno)}`.toUpperCase();
}

/**
 * Iniciales a partir del nombre ya concatenado, para las apps cuyo backend no
 * devuelve los campos por separado (sat-ui): toma la primera letra de las dos
 * primeras palabras ("JUAN CARLOS PEREZ" → "JC").
 */
export function inicialesDeNombre(nombre: string | null | undefined): string {
    const palabras = nombre?.trim().split(/\s+/).filter(Boolean) ?? [];
    return palabras
        .slice(0, 2)
        .map((palabra) => palabra.charAt(0))
        .join('')
        .toUpperCase();
}

/**
 * Normaliza el rol al catálogo que usan las apps SIGEC: la API lo devuelve
 * capitalizado ("Postulante") y las OA se tratan como postulantes.
 * Devuelve `string` a propósito — cada app lo estrecha a su propio `UserRole`
 * sin que la lib tenga que conocer todos los catálogos.
 */
export function normalizarRol(roles: readonly string[] | null | undefined, porDefecto = 'POSTULANTE'): string {
    const rol = roles?.[0]?.trim().toUpperCase();
    if (!rol) return porDefecto;
    return rol === 'OA' ? 'POSTULANTE' : rol;
}

/** Convierte el usuario de la API en la sesión que consumen las apps. */
export function mapSelUsuario(dto: SelUsuarioDto): SesionUsuario {
    return {
        id: String(dto.id),
        nombre: nombreCompleto(dto),
        iniciales: iniciales(dto),
        usuario: dto.usuario,
        email: dto.email ?? '',
        sigla: dto.sigla ?? '',
        rol: normalizarRol(dto.roles)
    };
}
