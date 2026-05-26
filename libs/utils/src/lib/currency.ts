export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN'
    }).format(value);
}

export function formatDate(value: string): string {
    if (!value) return '';
    return value;
}
