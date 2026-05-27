import { utils } from './utils';
import { formatDate } from './date-formatter';

describe('utils', () => {
  it('should work', () => {
    expect(utils()).toEqual('utils');
  });

  describe('formatDate', () => {
    it('should return fallback if dateStr is empty, null or undefined', () => {
      expect(formatDate(null)).toBe('-');
      expect(formatDate(undefined)).toBe('-');
      expect(formatDate('')).toBe('-');
      expect(formatDate('   ')).toBe('-');
      expect(formatDate('', undefined, 'N/A')).toBe('N/A');
    });

    it('should correctly format YYYY-MM-DD local time immune to UTC shift', () => {
      // YYYY-MM-DD should be parsed locally. E.g. "2026-05-26" -> 26/5/2026
      expect(formatDate('2026-05-26')).toBe('26/5/2026');
    });

    it('should handle timestamp strings cleanly', () => {
      expect(formatDate('2026-05-26T23:14:25')).toBe('26/5/2026');
    });

    it('should support custom fallback', () => {
      expect(formatDate('invalid-date', undefined, 'Empty')).toBe('Empty');
    });
  });
});

