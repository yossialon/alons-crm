import { z } from 'zod';
import { sanitizeUrl } from '@/lib/api-utils';

const urlField = z
  .string()
  .transform(sanitizeUrl)
  .default('');

const emailField = z
  .union([z.string().email(), z.literal('')])
  .default('');

export const LeadCreateSchema = z.object({
  name:      z.string().min(1, 'Name is required').max(200).transform((s) => s.trim()),
  phone:     z.string().min(1, 'Phone is required').max(50).transform((s) => s.trim()),
  email:     emailField,
  type:      z.enum(['Homeowner', 'Contractor', 'Developer']).default('Homeowner'),
  area:      z.string().min(1).max(100).default('Boca Raton'),
  status:    z.enum(['new', 'contacted', 'qualified', 'closed']).default('new'),
  source:    z.string().max(100).default('Manual'),
  notes:     z.string().max(5000).default(''),
  website:   urlField,
  rating:    z.string().max(20).default(''),
  potential: z.enum(['high', 'medium', 'low']).default('medium'),
  date:      z.string().date().optional().nullable(),
});

export const LeadUpdateSchema = LeadCreateSchema.partial().extend({
  name:  z.string().min(1).max(200).transform((s) => s.trim()),
  phone: z.string().min(1).max(50).transform((s) => s.trim()),
});

export type LeadCreate = z.infer<typeof LeadCreateSchema>;
export type LeadUpdate = z.infer<typeof LeadUpdateSchema>;
