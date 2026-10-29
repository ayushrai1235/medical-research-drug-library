import { describe, it, expect } from 'vitest';
import {
  researchSessionSchema,
  adminLoginSchema,
  zipDownloadRequestSchema,
  comparisonDownloadRequestSchema,
} from '../lib/validation/schemas';

describe('Validation Schemas', () => {
  it('validates valid research session inputs', () => {
    const valid = researchSessionSchema.safeParse({
      displayName: 'Dr. Sarah Connor',
      language: 'en',
    });
    expect(valid.success).toBe(true);
  });

  it('rejects short or empty display names', () => {
    const invalidShort = researchSessionSchema.safeParse({
      displayName: 'A',
      language: 'en',
    });
    expect(invalidShort.success).toBe(false);

    const invalidEmpty = researchSessionSchema.safeParse({
      displayName: '   ',
      language: 'en',
    });
    expect(invalidEmpty.success).toBe(false);
  });

  it('rejects unready languages (Hindi/Gujarati Coming Soon)', () => {
    const hindi = researchSessionSchema.safeParse({
      displayName: 'Dr. Ramesh',
      language: 'hi',
    });
    expect(hindi.success).toBe(false);

    const gujarati = researchSessionSchema.safeParse({
      displayName: 'Dr. Patel',
      language: 'gu',
    });
    expect(gujarati.success).toBe(false);
  });

  it('validates admin login credentials', () => {
    const valid = adminLoginSchema.safeParse({
      email: 'admin@medicalresearch.org',
      password: 'AdminPassword123!',
    });
    expect(valid.success).toBe(true);

    const invalidEmail = adminLoginSchema.safeParse({
      email: 'not-an-email',
      password: 'AdminPassword123!',
    });
    expect(invalidEmail.success).toBe(false);

    const invalidPassword = adminLoginSchema.safeParse({
      email: 'admin@medicalresearch.org',
      password: '123',
    });
    expect(invalidPassword.success).toBe(false);
  });

  it('validates ZIP download request bounds', () => {
    const emptyZip = zipDownloadRequestSchema.safeParse({
      drugIds: [],
    });
    expect(emptyZip.success).toBe(false);

    const validZip = zipDownloadRequestSchema.safeParse({
      drugIds: ['a25501fb-9457-41a7-8a48-5c4d32e6a4b1'],
    });
    expect(validZip.success).toBe(true);
  });

  it('validates comparison download request with two UUIDs', () => {
    const valid = comparisonDownloadRequestSchema.safeParse({
      drugId1: 'a25501fb-9457-41a7-8a48-5c4d32e6a4b1',
      drugId2: 'b25501fb-9457-41a7-8a48-5c4d32e6a4b2',
    });
    expect(valid.success).toBe(true);

    const invalid = comparisonDownloadRequestSchema.safeParse({
      drugId1: 'not-uuid',
      drugId2: 'b25501fb-9457-41a7-8a48-5c4d32e6a4b2',
    });
    expect(invalid.success).toBe(false);
  });
});

