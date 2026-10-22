/** Año que se muestra cuando falta la fecha (o es la mínima que envían las APIs .NET, 0001-01-01). */
const ANIO_DESCONOCIDO = 'XXXX';

/**
 * Año de `fecha`. De un texto ISO ("2023-01-01", "2023-01-01T00:00:00") se toma el año escrito, sin pasar por
 * `Date`: `new Date('2023-01-01')` es medianoche UTC y en Lima (UTC-5) daría 2022.
 */
function anioDe(fecha?: string | Date | null): string {
    if (!fecha) return ANIO_DESCONOCIDO;
    const iso = typeof fecha === 'string' ? /^\s*(\d{4})-/.exec(fecha) : null;
    const anio = iso ? Number(iso[1]) : new Date(fecha).getFullYear();
    return Number.isFinite(anio) && anio >= 1900 ? String(anio) : ANIO_DESCONOCIDO;
}

/** Rellena `numero` a 4 dígitos y le añade el año de `fecha` (formato "NNNN-YYYY"). */
function padNumberWithYear(numero?: string | number | null, fecha?: string | Date | null): string {
    if (numero === undefined || numero === null || numero === '') return '-';
    const padded = numero.toString().trim().padStart(4, '0');
    return `${padded}-${anioDe(fecha)}`;
}

/**
 * Número oficial del convenio, "NNNN-YYYY-ST" (ej. "0048-2023-ST"). Es el único formato de los módulos de
 * AGROIDEAS (KOFIX, RTF, Cierre): el año es siempre el de la **fecha de firma** del convenio (ADR 0014).
 * - Sin número: "-".
 * - Si ya viene formateado (contiene "-ST"), se devuelve tal cual.
 * - Si no es numérico (ej. "S/N"), se devuelve tal cual: no se inventa un correlativo.
 * - Sin fecha de firma válida, el año es "XXXX".
 */
export function formatConvenioNumber(numeroConvenio?: string | number | null, fechaFirma?: string | Date | null): string {
    if (numeroConvenio === undefined || numeroConvenio === null) return '-';
    const numero = numeroConvenio.toString().trim();
    if (!numero) return '-';
    if (numero.toUpperCase().includes('-ST')) return numero;
    if (!/^\d+$/.test(numero)) return numero;
    return `${padNumberWithYear(Number(numero), fechaFirma)}-ST`;
}

/** Formatea un número de solicitud (desembolso, etc.) como "NNNN-YYYY", tomando el año de `fecha`. */
export function formatSolicitudNumber(numeroSolicitud?: string | number | null, fecha?: string | Date | null): string {
    return padNumberWithYear(numeroSolicitud, fecha);
}
