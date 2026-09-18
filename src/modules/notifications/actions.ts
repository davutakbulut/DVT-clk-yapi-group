'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';

/** Okundu: security definer RPC (0005) — payload'a dokunulamaz, yalnız kendi/rol bildirimleri. */
export async function markNotificationsRead(ids: readonly string[]): Promise<number> {
  const gate = await requireRole();
  if (!gate.ok) return 0;
  const parsed = z.array(z.string().uuid()).max(200).safeParse(ids);
  if (!parsed.success || parsed.data.length === 0) return 0;
  const client = await createServerClient();
  if (!client.ok) return 0;
  const { data, error } = await client.data.rpc('mark_notifications_read', { p_ids: parsed.data });
  if (error) {
    logger.warn('Bildirim okundu isaretlenemedi', { module: 'notifications', code: error.code, message: error.message });
    return 0;
  }
  revalidatePath('/admin/notifications');
  return data ?? 0;
}

/** Liste sayfası formu (JS'siz): tek ya da tüm görünenler. */
export async function markReadForm(formData: FormData): Promise<void> {
  const ids = formData.getAll('id').map(String);
  await markNotificationsRead(ids);
}
