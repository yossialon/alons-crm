import { z } from 'zod';
import { sanitizeUrl } from '@/lib/api-utils';

export const ScanResultItemSchema = z.object({
  name:      z.string().max(200).default(''),
  phone:     z.string().max(50).default(''),
  email:     z.union([z.string().email(), z.literal('')]).default(''),
  website:   z.string().transform(sanitizeUrl).default(''),
  area:      z.string().max(100).default(''),
  type:      z.string().max(50).default(''),
  source:    z.string().max(100).default(''),
  rating:    z.string().max(20).default(''),
  potential: z.string().max(20).default('medium'),
  notes:     z.string().max(5000).default(''),
});

export const ScanResultsBatchSchema = z.object({
  results: z.array(ScanResultItemSchema).min(1).max(200),
});

export type ScanResultItem = z.infer<typeof ScanResultItemSchema>;
