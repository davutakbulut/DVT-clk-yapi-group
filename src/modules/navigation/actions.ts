'use server';

import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { CACHE_TAGS } from '@/core/cache/tags';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { DONE, failed, type ActionState } from '@/lib/formState';

const MODULE = 'navigation';
const MANAGERS = ['super_admin', 'admin'] as const;

const itemSchema = z
  .object({
    id: z.string().uuid().optional(),
    menuId: z.string().uuid(),
    parentId: z.string().uuid().optional().or(z.literal('')),
    labelTr: z.string().trim().min(1).max(80),
    labelEn: z.string().trim().max(80).optional().or(z.literal('')),
    linkType: z.enum(['internal', 'external', 'anchor', 'none']),
    internalPath: z.string().trim().regex(/^\/[a-z0-9-]*(\/[a-z0-9-]+)*$/).optional().or(z.literal('')),
    externalUrl: z.string().trim().url().optional().or(z.literal('')),
    anchor: z.string().trim().regex(/^[a-z0-9-]+$/).optional().or(z.literal('')),
    headerSlot: z.enum(['left', 'right', '']).optional(),
    isCta: z.coerce.boolean().optional(),
    openInNewTab: z.coerce.boolean().optional(),
    isActive: z.coerce.boolean().optional(),
    localeTr: z.coerce.boolean().optional(),
    localeEn: z.coerce.boolean().optional(),
  })
  .refine((v) => v.linkType !== 'internal' || v.internalPath, { path: ['internalPath'] })
  .refine((v) => v.linkType !== 'external' || v.externalUrl, { path: ['externalUrl'] })
  .refine((v) => v.linkType !== 'anchor' || v.anchor, { path: ['anchor'] });

function checkbox(formData: FormData, name: string): boolean {
  return formData.get(name) === 'on' || formData.get(name) === 'true';
}

export async function saveMenuItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(MANAGERS);
  if (!gate.ok) return failed('forbidden');
  const raw = Object.fromEntries(formData);
  const parsed = itemSchema.safeParse({
    ...raw,
    isCta: checkbox(formData, 'isCta'),
    openInNewTab: checkbox(formData, 'openInNewTab'),
    isActive: checkbox(formData, 'isActive'),
    localeTr: checkbox(formData, 'localeTr'),
    localeEn: checkbox(formData, 'localeEn'),
  });
  if (!parsed.success) return failed('validation', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation'])));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');

  const label: Record<string, string> = { tr: v.labelTr };
  if (v.labelEn) label['en'] = v.labelEn;
  const locales = [...(v.localeTr === false ? [] : ['tr']), ...(v.localeEn ? ['en'] : [])];
  const row = {
    menu_id: v.menuId,
    parent_id: v.parentId || null,
    label,
    link_type: v.linkType,
    internal_path: v.linkType === 'internal' ? v.internalPath || null : null,
    external_url: v.linkType === 'external' ? v.externalUrl || null : null,
    anchor: v.linkType === 'anchor' ? v.anchor || null : null,
    header_slot: v.headerSlot || null,
    is_cta: v.isCta ?? false,
    open_in_new_tab: v.openInNewTab ?? false,
    is_active: v.isActive ?? true,
    locales: locales.length ? locales : ['tr'],
  };
  const query = v.id ? client.data.from('menu_items').update(row).eq('id', v.id) : client.data.from('menu_items').insert(row);
  const { error } = await query;
  if (error) {
    logger.error('Menü öğesi kaydedilemedi', { module: MODULE, code: error.code, message: error.message });
    return failed(error.code === '42501' ? 'forbidden' : 'unexpected');
  }
  revalidateTag(CACHE_TAGS.menus);
  return DONE;
}

export async function deleteMenuItem(formData: FormData): Promise<void> {
  const gate = await requireRole(MANAGERS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('menu_items').delete().eq('id', id.data);
  if (error) logger.error('Menü öğesi silinemedi', { module: MODULE, code: error.code });
  revalidateTag(CACHE_TAGS.menus);
}

/** Aynı üst öğe altındaki sıralı id listesi; tek RPC (0015) ile tek ifadede yazılır. */
export async function reorderMenuItems(formData: FormData): Promise<void> {
  const gate = await requireRole(MANAGERS);
  if (!gate.ok) return;
  const ids = z.array(z.string().uuid()).min(1).safeParse(String(formData.get('ids') ?? '').split(',').filter(Boolean));
  if (!ids.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.rpc('reorder_menu_items', { p_ids: ids.data });
  if (error) logger.error('Menü sıralanamadı', { module: MODULE, code: error.code });
  revalidateTag(CACHE_TAGS.menus);
}
