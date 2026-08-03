/**
 * Utilidades para presentar los mensajes de error que devuelven las APIs
 * MIDAGRI.
 *
 * El estándar MCVS-604 (sección 3.5) define el campo `mensaje` del envoltorio
 * de respuesta con el formato `CODIGO_ERROR:detalle`:
 *
 * ```json
 * { "respuesta": "ERROR", "mensaje": "ERROR_0503:El servicio no está disponible." }
 * ```
 *
 * El código es para diagnóstico y trazabilidad, no para el usuario final.
 * Volcar `mensaje` tal cual en un aviso hace que se lea
 * «ERROR_0503:El servicio no está disponible.», que es ruido.
 *
 * No todos los mensajes llevan código: los que construyen los controladores
 * con sus propios textos («Visita programada no encontrada.») llegan sin
 * prefijo y se devuelven intactos.
 */

/** Mensaje de error descompuesto en sus dos partes. */
export interface MensajeErrorApi {
    /** Código de diagnóstico, o `null` si el mensaje no lo lleva. */
    codigo: string | null;
    /** Texto apto para mostrar al usuario. */
    detalle: string;
}

/**
 * Separa el código del detalle.
 *
 * Solo se considera código un prefijo en mayúsculas sin espacios seguido de
 * dos puntos, de modo que un texto legítimo con dos puntos no se trunca:
 * «Estado inválido. Valores permitidos: PENDIENTE, COMPLETADA» se devuelve
 * completo porque la parte previa a los dos puntos no es un código.
 */
export function separarMensajeError(mensaje: string | null | undefined): MensajeErrorApi {
    const texto = (mensaje ?? '').trim();
    if (!texto) {
        return { codigo: null, detalle: '' };
    }

    const coincidencia = /^([A-Z][A-Z0-9_]*)\s*:\s*([\s\S]+)$/.exec(texto);
    if (!coincidencia) {
        return { codigo: null, detalle: texto };
    }

    return { codigo: coincidencia[1], detalle: coincidencia[2].trim() };
}

/**
 * Devuelve el texto que debe verse en pantalla ante un error HTTP.
 *
 * Sustituye al patrón `err.error?.mensaje || 'Texto por defecto'`, que desde
 * que las APIs devuelven el envoltorio también en los errores no controlados
 * termina mostrando el código al usuario.
 *
 * @param error Error capturado (normalmente un `HttpErrorResponse`).
 * @param porDefecto Texto a usar si la respuesta no trae mensaje.
 */
export function mensajeParaUsuario(error: unknown, porDefecto: string): string {
    const cuerpo = (error as { error?: { mensaje?: string } })?.error;
    const { detalle } = separarMensajeError(cuerpo?.mensaje);
    return detalle || porDefecto;
}

/**
 * Devuelve el código de diagnóstico, o `null` si no lo hay. Pensado para
 * registrarlo en consola o en telemetría junto al error.
 */
export function codigoDeError(error: unknown): string | null {
    const cuerpo = (error as { error?: { mensaje?: string } })?.error;
    return separarMensajeError(cuerpo?.mensaje).codigo;
}
