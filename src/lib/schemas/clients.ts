import { z } from 'zod';

export const ClientCreateSchema = z.object({
  name:    z.string().min(1, 'Name is required').max(200).transform((s) => s.trim()),
  lead_id: z.string().uuid().optional().nullable(),
  phone:   z.string().max(50).default(''),
  email:   z.union([z.string().email(), z.literal('')]).default(''),
  address: z.string().max(500).default(''),
  notes:   z.string().max(5000).default(''),
});

export const ClientUpdateSchema = ClientCreateSchema.partial().extend({
  name: z.string().min(1).max(200).transform((s) => s.trim()),
});

export type ClientCreate = z.infer<typeof ClientCreateSchema>;
export type ClientUpdate = z.infer<typeof ClientUpdateSchema>;
