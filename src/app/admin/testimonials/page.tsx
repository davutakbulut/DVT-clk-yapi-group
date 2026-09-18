import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { GoogleSyncPanel, TestimonialForm } from '@/modules/testimonials';
import { deleteTestimonial, moveTestimonial, setTestimonialStatus } from '@/modules/testimonials/actions';
import { listSyncRuns, listTestimonialChoices, listTestimonialsForAdmin, readGooglePlaceSetting, type TestimonialStatusFilter } from '@/modules/testimonials/server';

const FILTERS: TestimonialStatusFilter[] = ['pending', 'published', 'rejected', 'archived', 'all'];

export default async function AdminTestimonialsPage({ searchParams }: { readonly searchParams: Promise<{ status?: string }> }) {
  const [t, gate, sp] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor']), searchParams]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const status = (FILTERS.includes(sp.status as TestimonialStatusFilter) ? sp.status : 'pending') as TestimonialStatusFilter;
  const isAdmin = gate.data.role === 'super_admin' || gate.data.role === 'admin';
  const [rows, choices, runs, google] = await Promise.all([listTestimonialsForAdmin(status), listTestimonialChoices(), listSyncRuns(), isAdmin ? readGooglePlaceSetting() : Promise.resolve(null)]);
  if (!rows.ok || !choices.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  const c = choices.data;

  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('testimonials.title')} lead={t('testimonials.lead')} />
      <nav aria-label={t('form.status')} className="flex flex-wrap gap-2 text-sm">
        {FILTERS.map((f) => (
          <NextLink key={f} href={`/admin/testimonials?status=${f}`} aria-current={f === status ? 'page' : undefined} className={`rounded-md border px-3 py-1 ${f === status ? 'bg-muted font-medium' : ''}`}>
            {t(`testimonials.filters.${f}`)}
          </NextLink>
        ))}
      </nav>

      <section className="grid gap-2">
        <h2 className="text-sm font-medium">{t('testimonials.new')}</h2>
        <div className="rounded-md border p-4">
          <TestimonialForm testimonial={null} services={c.services} projects={c.projects} products={c.products} />
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="text-sm font-medium">{t('testimonials.count', { count: rows.data.length })}</h2>
        {rows.data.length === 0 ? <p className="text-sm text-muted-foreground">{t('common.empty')}</p> : null}
        {rows.data.map((m, i) => (
          <details key={m.id} className="rounded-md border">
            <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-2 text-sm">
              <span aria-label={`${m.rating}/5`}>{'★'.repeat(m.rating)}</span>
              <span className="font-medium">{m.author_name}</span>
              {m.company ? <span className="text-muted-foreground">{m.company}</span> : null}
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{t(`testimonials.sources.${m.source as 'manual'}`)}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{t(`testimonials.statuses.${m.status as 'pending'}`)}</span>
              {m.is_featured ? <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{t('form.featured')}</span> : null}
              {m.linkedLabel ? <span className="text-xs text-muted-foreground">{m.linkedLabel}</span> : null}
              <span className="ml-auto max-w-[40ch] truncate text-xs text-muted-foreground">{m.body['tr'] ?? m.body['en'] ?? ''}</span>
            </summary>
            <div className="grid gap-4 border-t p-4">
              <div className="flex flex-wrap gap-2">
                {m.status !== 'published' ? (
                  <form action={setTestimonialStatus}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="status" value="published" />
                    <Button type="submit" size="sm">
                      {t('testimonials.approve')}
                    </Button>
                  </form>
                ) : null}
                {m.status !== 'rejected' ? (
                  <form action={setTestimonialStatus}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="status" value="rejected" />
                    <Button type="submit" size="sm" variant="outline">
                      {t('testimonials.reject')}
                    </Button>
                  </form>
                ) : null}
                <form action={moveTestimonial}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="direction" value="up" />
                  <Button type="submit" size="sm" variant="outline" disabled={i === 0} aria-label={`${t('common.up')}: ${m.author_name}`}>
                    ↑
                  </Button>
                </form>
                <form action={moveTestimonial}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="direction" value="down" />
                  <Button type="submit" size="sm" variant="outline" disabled={i === rows.data.length - 1} aria-label={`${t('common.down')}: ${m.author_name}`}>
                    ↓
                  </Button>
                </form>
                <form action={deleteTestimonial} className="ml-auto">
                  <input type="hidden" name="id" value={m.id} />
                  <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                    {t('common.delete')}
                  </Button>
                </form>
              </div>
              <TestimonialForm testimonial={m} services={c.services} projects={c.projects} products={c.products} />
            </div>
          </details>
        ))}
      </section>

      {isAdmin && google?.ok ? (
        <section className="grid gap-3">
          <h2 className="text-sm font-medium">{t('testimonials.google')}</h2>
          <GoogleSyncPanel placeId={google.data.placeId} apiKeyConfigured={google.data.apiKeyConfigured} />
          {runs.ok && runs.data.length > 0 ? (
            <ul className="grid gap-1 text-xs text-muted-foreground">
              {runs.data.map((r) => (
                <li key={r.id}>
                  {r.started_at.slice(0, 16).replace('T', ' ')} · {r.status} · {t('testimonials.runCounts', { fetched: r.fetched_count, inserted: r.inserted_count, updated: r.updated_count })}
                  {r.error ? ` · ${r.error}` : ''}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
