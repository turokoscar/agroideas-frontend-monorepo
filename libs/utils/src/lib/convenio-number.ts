/** Rellena `numero` a 4 dígitos y le añade el año de `fecha` (formato "NNNN-YYYY"). */
function padNumberWithYear(numero?: string | number | null, fecha?: string | Date | null): string {
    if (numero === undefined || numero === null || numero === '') return '-';
    const padded = numero.toString().padStart(4, '0');
    const year = fecha ? new Date(fecha).getFullYear() : 'XXXX';
    return `${padded}-${year}`;
}

export function formatConvenioNumber(numeroConvenio?: string | null, fechaInicio?: string | null): string {
    if (!numeroConvenio) return '-';
    if (numeroConvenio.includes('-ST')) {
        return numeroConvenio;
    }
    return `${padNumberWithYear(numeroConvenio, fechaInicio)}-ST`;
}

/** Formatea un número de solicitud (desembolso, etc.) como "NNNN-YYYY", tomando el año de `fecha`. */
export function formatSolicitudNumber(numeroSolicitud?: string | number | null, fecha?: string | Date | null): string {
    return padNumberWithYear(numeroSolicitud, fecha);
}
