import { clsx, type ClassValue } from 'clsx'
import type { UseFormSetError } from 'react-hook-form'
import type { ValidationError } from '@/types'
import type { ZodObject } from 'zod'
import { toast } from 'react-toastify'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const handleValidationErrors = (
  response: {
    message: string
    errors?: ValidationError[] | null
  },
  setError: UseFormSetError<any>,
  options?: {
    fields?: string[]
    schema?: ZodObject<any>
    getFields?: () => string[]
    silent?: boolean
  },
) => {
  /**
   * Usage with form schema (react-hook-form + zod):
   *
   * const schema = z.object({
   *   username: z.string().min(1),
   *   email: z.string().email(),
   *   password: z.string().min(8),
   * })
   * const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })
   *
   * try {
   *   await mutate()
   * } catch (err: any) {
   *   const res = err.response?.data as { message: string; errors?: ValidationError[] }
   *   handleValidationErrors(res, form.setError, { schema })
   * }
   */

  const items: ValidationError[] = Array.isArray(response.errors) ? response.errors : []
  if (items.length === 0) {
    if (!options?.silent) toast.error(response.message)
    return
  }
  const derivedFields =
    options?.fields && options.fields.length > 0
      ? options.fields
      : options?.getFields
        ? options.getFields()
        : options?.schema && (options.schema as any).shape
          ? Object.keys((options.schema as any).shape)
          : undefined
  const allow = derivedFields && derivedFields.length > 0 ? new Set(derivedFields) : null
  let mismatched = false
  items.forEach((item) => {
    const ok = allow ? allow.has(item.field) : true
    if (ok) {
      setError(item.field as any, { type: 'manual', message: item.message })
    } else {
      mismatched = true
    }
  })
  if (mismatched && !options?.silent) toast.error(response.message)
}
