import { z } from 'zod'
export const testSchema = z.object({
  name: z.string().min(1),
  status: z.enum(['active', 'inactive']).default('active'),
})
export type TestInput = z.infer<typeof testSchema>