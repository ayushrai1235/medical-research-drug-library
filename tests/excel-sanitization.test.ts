import { describe, it, expect } from 'vitest';
import { sanitizeCellValue } from '../lib/exports/excel';

describe('Excel Formula Injection Protection', () => {
  it('neutralizes formulas starting with =', () => {
    const dangerous = '=SUM(A1:A10)';
    const sanitized = sanitizeCellValue(dangerous);
    expect(sanitized).toBe("'=SUM(A1:A10)");
  });

  it('neutralizes formulas starting with + or -', () => {
    expect(sanitizeCellValue('+1+2')).toBe("'+1+2");
    expect(sanitizeCellValue('-100')).toBe("'-100");
  });

  it('neutralizes formulas starting with @', () => {
    expect(sanitizeCellValue('@SUM(B1)')).toBe("'@SUM(B1)");
  });

  it('leaves safe values untouched', () => {
    expect(sanitizeCellValue('Metformin')).toBe('Metformin');
    expect(sanitizeCellValue('Dr. Jane Smith')).toBe('Dr. Jane Smith');
    expect(sanitizeCellValue(42)).toBe(42);
    expect(sanitizeCellValue(null)).toBe(null);
  });
});
