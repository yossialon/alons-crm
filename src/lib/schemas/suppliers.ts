import { z } from 'zod';

export const SupplierCreateSchema = z.object({
  name:         z.string().min(1, 'Name is required').max(200).transform((s) => s.trim()),
  contact:      z.string().max(200).default(''),
  phone:        z.string().max(50).default(''),
  email:        z.union([z.string().email(), z.literal('')]).default(''),
  category:     z.string().max(100).default('Hardware'),
  status:       z.enum(['active', 'pending', 'inactive']).default('active'),
  notes:        z.string().max(5000).default(''),
  last_contact: z.string().date().optional().nullable(),
});

export const SupplierUpdateSchema = SupplierCreateSchema.partial().extend({
  name: z.string().min(1).max(200).transform((s) => s.trim()),
});

export type SupplierCreate = z.infer<typeof SupplierCreateSchema>;
export type SupplierUpdate = z.infer<typeof SupplierUpdateSchema>;
