'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { setResolved } from './data/errorsRepository';

/** Çözüldü / yeniden aç (admin). Tekrar görülürse RPC zaten yeniden açar (0037). */
export async function toggleResolved(formData: FormData): Promise<void> {
  const gate = await requireRole(['super_admin', 'admin']);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  await setResolved(id.data, formData.get('resolved') === 'true', gate.data.id);
  revalidatePath('/admin/errors');
  revalidatePath('/admin');
}
