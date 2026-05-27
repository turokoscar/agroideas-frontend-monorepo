export function formatDate(
  dateStr: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  fallback = '-'
): string {
  if (!dateStr) return fallback;
  try {
    const cleanDateStr = typeof dateStr === 'string' ? dateStr.trim() : '';
    if (!cleanDateStr) return fallback;

    // Check if it matches YYYY-MM-DD format (with optional time component)
    const match = cleanDateStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}):(\d{2}))?/);
    let date: Date;
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // 0-indexed month
      const day = parseInt(match[3], 10);
      if (match[4]) {
        const hours = parseInt(match[4], 10);
        const minutes = parseInt(match[5], 10);
        const seconds = parseInt(match[6], 10);
        date = new Date(year, month, day, hours, minutes, seconds);
      } else {
        date = new Date(year, month, day);
      }
    } else {
      date = new Date(cleanDateStr);
    }

    if (isNaN(date.getTime())) return fallback;

    return date.toLocaleDateString('es-PE', options);
  } catch {
    return fallback;
  }
}
