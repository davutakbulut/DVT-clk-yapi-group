import { z } from 'zod';

const opt = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

/** TCKN (11 hane, ilk hane 0 olamaz) ya da VKN (10 hane). Sağlama toplamı doğrulaması yok — resmi doğrulama muhasebede. */
export const taxIdPattern = /^(\d{10}|[1-9]\d{10})$/;

export const customerSchema = z
  .object({
    id: z.string().uuid().optional().or(z.literal('')),
    type: z.enum(['individual', 'corporate']),
    fullName: opt(160),
    companyTitle: opt(200),
    taxOffice: opt(120),
    taxId: z.string().trim().regex(taxIdPattern).optional().or(z.literal('')),
    address: opt(500),
    city: opt(80),
    district: opt(80),
    email: z.string().trim().email().max(200).optional().or(z.literal('')),
    phone: z.string().trim().regex(/^\+?[0-9\s()./-]{7,24}$/).optional().or(z.literal('')),
    contactPerson: opt(160),
    contactPhone: z.string().trim().regex(/^\+?[0-9\s()./-]{7,24}$/).optional().or(z.literal('')),
    notes: opt(4000),
    source: z.enum(['lead', 'configurator', 'manual']).default('manual'),
    profileId: z.string().uuid().optional().or(z.literal('')),
    isActive: z.boolean(),
  })
  // 0007 CHECK: ad ya da ünvan zorunlu; kurumsal müşteride ünvan, bireyselde ad beklenir
  .refine((v) => (v.type === 'corporate' ? Boolean(v.companyTitle) : Boolean(v.fullName)), { message: 'name', path: ['fullName'] });

export type CustomerInput = z.infer<typeof customerSchema>;

/** Liste/başlıkta görünen ad: kurumsal → ünvan (yetkili), bireysel → ad. Anonim → "Anonim müşteri". */
export function displayName(c: { readonly type: string; readonly full_name: string | null; readonly company_title: string | null; readonly anonymized_at: string | null }, anonymLabel: string): string {
  if (c.anonymized_at && !c.company_title) return anonymLabel;
  return (c.type === 'corporate' ? c.company_title || c.full_name : c.full_name || c.company_title) || anonymLabel;
}
