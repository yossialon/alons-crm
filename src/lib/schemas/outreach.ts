import { z } from 'zod';

export const OutreachCreateSchema = z.object({
  lead_id:      z.string().uuid('lead_id must be a valid UUID'),
  method:       z.enum(['email', 'phone', 'sms', 'in_person', 'social']),
  direction:    z.enum(['outbound', 'inbound']).default('outbound'),
  outcome:      z
    .enum(['no_answer', 'callback', 'interested', 'not_interested', 'follow_up', 'converted'])
    .optional()
    .nullable(),
  notes:        z.string().max(5000).default(''),
  contacted_at: z.string().datetime({ offset: true }).optional(),
});

export type OutreachCreate = z.infer<typeof OutreachCreateSchema>;
