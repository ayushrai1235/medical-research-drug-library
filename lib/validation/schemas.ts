import { z } from 'zod';

export const researchSessionSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, { message: 'Display name must be at least 2 characters long' })
    .max(50, { message: 'Display name must not exceed 50 characters' })
    .refine((val) => !/^[0-9]+$/.test(val), {
      message: 'Display name must contain letters',
    }),
  language: z.enum(['en', 'hi', 'gu']).default('en').refine((val) => val === 'en', {
    message: 'Hindi and Gujarati are coming soon. Only English is currently available.',
  }),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

export const activityEventSchema = z.object({
  action: z.enum([
    'session_started',
    'drug_opened',
    'pdf_viewed',
    'drug_selected',
    'comparison_opened',
    'pdf_downloaded',
    'zip_downloaded',
    'comparison_pdf_downloaded',
  ]),
  drugId: z.string().uuid().optional().nullable(),
  relatedDrugIds: z.array(z.string().uuid()).optional().default([]),
  details: z.record(z.any()).optional().default({}),
});

export const signedUrlRequestSchema = z.object({
  drugId: z.string().uuid(),
});

export const zipDownloadRequestSchema = z.object({
  drugIds: z
    .array(z.string().uuid())
    .min(1, { message: 'At least one drug must be selected for ZIP download' })
    .max(19, { message: 'Cannot exceed total drug count' }),
});

export const comparisonDownloadRequestSchema = z.object({
  drugId1: z.string().uuid({ message: 'Valid Drug 1 ID is required' }),
  drugId2: z.string().uuid({ message: 'Valid Drug 2 ID is required' }),
});

export const adminActivityFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
  search: z.string().optional(),
  action: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  drugId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  downloadType: z.string().optional(),
});
