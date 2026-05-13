import { z } from 'zod';

export const TaskCreateSchema = z.object({
  title:       z.string().min(1, 'Title is required').max(200).transform((s) => s.trim()),
  description: z.string().max(5000).default(''),
  lead_id:     z.string().uuid().optional().nullable(),
  project_id:  z.string().uuid().optional().nullable(),
  client_id:   z.string().uuid().optional().nullable(),
  status:      z.enum(['open', 'in_progress', 'done']).default('open'),
  priority:    z.enum(['high', 'medium', 'low']).default('medium'),
  due_date:    z.string().date().optional().nullable(),
});

export const TaskUpdateSchema = TaskCreateSchema.partial().extend({
  title: z.string().min(1).max(200).transform((s) => s.trim()),
});

export type TaskCreate = z.infer<typeof TaskCreateSchema>;
export type TaskUpdate = z.infer<typeof TaskUpdateSchema>;
