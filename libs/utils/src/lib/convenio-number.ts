export function formatConvenioNumber(numeroConvenio?: string | null, fechaInicio?: string | null): string {
    if (!numeroConvenio) return '-';
    if (numeroConvenio.includes('-ST')) {
        return numeroConvenio;
    }
    const padded = numeroConvenio.toString().padStart(4, '0');
    const year = fechaInicio ? new Date(fechaInicio).getFullYear() : 'XXXX';
    return `${padded}-${year}-ST`;
}
