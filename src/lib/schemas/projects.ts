import { z } from 'zod';

export const ProjectCreateSchema = z.object({
  name:       z.string().min(1, 'Name is required').max(200).transform((s) => s.trim()),
  client_id:  z.string().uuid().optional().nullable(),
  lead_id:    z.string().uuid().optional().nullable(),
  status:     z.enum(['estimate', 'active', 'completed', 'cancelled']).default('estimate'),
  budget:     z.number().positive().optional().nullable(),
  start_date: z.string().date().optional().nullable(),
  end_date:   z.string().date().optional().nullable(),
  notes:      z.string().max(5000).default(''),
});

export const ProjectUpdateSchema = ProjectCreateSchema.partial().extend({
  name: z.string().min(1).max(200).transform((s) => s.trim()),
});

export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;
export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;
