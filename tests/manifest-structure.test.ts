import { describe, it, expect } from 'vitest';
import { APPROVED_DRUGS, generateManifest } from '../scripts/generate-drug-manifest.mjs';

describe('Drug Manifest & Mapping Logic', () => {
  it('contains exactly 7 approved categories and 19 drugs', () => {
    expect(APPROVED_DRUGS.length).toBe(19);

    const categories = new Set(APPROVED_DRUGS.map((d) => d.category));
    expect(categories.size).toBe(7);

    // Verify key categories exist
    expect(categories.has('Biguanides')).toBe(true);
    expect(categories.has('DPP-4 Inhibitors')).toBe(true);
    expect(categories.has('TZDs (Thiazolidinediones)')).toBe(true);
    expect(categories.has('Sulfonylureas')).toBe(true);
    expect(categories.has('Alpha-glucosidase Inhibitors')).toBe(true);
    expect(categories.has('SGLT-2 Inhibitors')).toBe(true);
    expect(categories.has('Non-Sulphonylureas')).toBe(true);
  });

  it('matches all 19 local PDFs with 0 missing, 0 ambiguous, and 0 duplicates', () => {
    const result = generateManifest();

    expect(result.summary.total).toBe(19);
    expect(result.summary.matched).toBe(19);
    expect(result.summary.missing).toBe(0);
    expect(result.summary.ambiguous).toBe(0);
    expect(result.summary.duplicate).toBe(0);
    expect(result.success).toBe(true);
  });
});

