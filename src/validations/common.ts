import { z } from 'zod'

export const commonSchemas = {
  objectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  url: z.string().url('Invalid URL format'),
  pagination: z.object({
    page: z.coerce.number().int().min(1, 'Page must be at least 1').optional(),
    limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').optional(),
  }),
  sorting: z.object({
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
  active: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((val) => (typeof val === 'boolean' ? val : val === 'true'))
    .optional()
    .default(true),
  fileUpload: z.instanceof(File),
  dateRange: z
    .object({
      startDate: z.union([z.string().datetime('Invalid start date format'), z.date()]),
      endDate: z.union([z.string().datetime('Invalid end date format'), z.date()]),
    })
    .transform((data) => {
      const s = typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate
      const e = typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate
      return { startDate: s, endDate: e }
    })
    .refine((data) => data.startDate <= data.endDate, { message: 'Start date must be before or equal to end date' }),
  status: z.enum(['active', 'inactive'], { message: 'Status must be either active or inactive' }),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  hexColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color format'),
  ipAddress: z.string().refine((val) => {
    try {
      const parts = val.split('.')
      if (parts.length !== 4) return false
      return parts.every((part) => {
        const num = parseInt(part, 10)
        return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString()
      })
    } catch {
      return false
    }
  }, 'Invalid IPv4 address'),
  jwtToken: z.string().regex(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/, 'Invalid JWT token format'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  jsonString: z.string().refine((val) => {
    try {
      JSON.parse(val)
      return true
    } catch {
      return false
    }
  }, 'Invalid JSON string'),
  strongPassword: z
    .string()
    .min(12, 'Password must be at least 12 characters long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  creditCard: z.string().regex(/^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/, 'Invalid credit card number format'),
  cvv: z.string().regex(/^\d{3,4}$/, 'CVV must be 3 or 4 digits'),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/, 'Invalid expiry date format (MM/YY)'),
  uuid: z.string().uuid('Invalid UUID format'),
  countryCode: z.string().regex(/^[A-Z]{2}$/, 'Invalid ISO 3166-1 alpha-2 country code'),
  postalCode: z.string().max(10, 'Postal code cannot exceed 10 characters'),
  timezone: z.string().refine((val) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: val })
      return true
    } catch {
      return false
    }
  }, 'Invalid timezone'),
  base64: z.string().refine((val) => {
    try {
      return btoa(atob(val)) === val
    } catch {
      return false
    }
  }, 'Invalid base64 string'),
  mongoDateString: z.string().datetime({ message: 'Invalid ISO 8601 datetime string' }),
  semver: z.string().regex(/^\d+\.\d+\.\d+(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/, 'Invalid semantic version'),
  ipv6: z.string().regex(/^(?:[\da-fA-F]{1,4}:){7}[\da-fA-F]{1,4}$/i, 'Invalid IPv6 address'),
  macAddress: z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 'Invalid MAC address format'),
  port: z.number().int().min(1).max(65535, 'Port must be between 1 and 65535'),
  fileName: z.string().regex(/^[^<>:"/\\|?*]+$/, 'Invalid file name'),
  mimeType: z.string().refine((val) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain', 'application/json', 'application/xml']
    return validTypes.includes(val)
  }, 'Unsupported MIME type'),
  currency: z.string().regex(/^[A-Z]{3}$/, 'Invalid ISO 4217 currency code'),
  price: z.number().positive('Price must be positive'),
  percentage: z.number().min(0).max(100, 'Percentage must be between 0 and 100'),
  rating: z.number().min(0).max(5, 'Rating must be between 0 and 5'),
  age: z.number().int().min(0).max(150, 'Age must be between 0 and 150'),
  gender: z.enum(['male', 'female', 'other'], { message: 'Gender must be male, female, or other' }),
  language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid language tag (e.g., en-US)'),
  time24: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid 24-hour time format (HH:MM)'),
  dateOnly: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  youtubeUrl: z.string().refine((val) => {
    try {
      const url = new URL(val)
      return url.hostname === 'www.youtube.com' || url.hostname === 'youtu.be'
    } catch {
      return false
    }
  }, 'Invalid YouTube URL'),
  twitterHandle: z.string().regex(/^@[A-Za-z0-9_]{1,15}$/, 'Invalid Twitter handle'),
  ethereumAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  bitcoinAddress: z.string().refine((val) => {
    return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(val) || /^bc1[a-z0-9]{39,59}$/i.test(val)
  }, 'Invalid Bitcoin address'),
  stripePublishableKey: z.string().regex(/^pk_live_[a-zA-Z0-9]+$/, 'Invalid Stripe publishable key'),
  googleRecaptchaToken: z.string().min(1, 'reCAPTCHA token is required'),
  firebasePushToken: z.string().min(1, 'Firebase push token is required'),
  appleDeviceToken: z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid Apple device token'),
  androidDeviceToken: z.string().min(1, 'Android device token is required'),
  statusFilter: z.enum(['active', 'inactive'], { message: 'Status filter must be either active or inactive' }),
} as const
