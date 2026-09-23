import { getFormatter, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getMyLead } from '../../data/accountRepository';
import { MESSAGE_KINDS, TAB_HREF } from '../../domain/types';
import { AccountForm } from './AccountForm';
import { sendLeadMessage } from '../../actions';
import { StatusBadge } from './StatusBadge';

/** Talep detayı: kalemler, yazışma (gelen/giden) ve mesaj / revizyon / iptal formu. Bulunamazsa null (sayfa 404 verir). */
export async function QuoteDetail({ id }: { readonly id: string }) {
  const [t, format, lead] = await Promise.all([getTranslations('Account.quotes'), getFormatter(), getMyLead(id)]);
  if (!lead.ok || !lead.data) return null;
  const l = lead.data;
  const closed = l.status === 'won' || l.status === 'lost';
  const kinds = MESSAGE_KINDS.filter((k) => !(closed && k === 'cancel_request'));
  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center gap-3 text-[length:var(--fs-sm)]">
        <Link href={TAB_HREF.quotes} className="underline underline-offset-4">← {t('detail')}</Link>
        <span className="label-mono">{l.refNo}</span>
        <StatusBadge status={l.status} />
        <span className="text-[var(--color-text-muted)]">{format.dateTime(new Date(l.createdAt), { dateStyle: 'long' })}</span>
        {l.quotedAmount !== null ? <span className="ml-auto font-medium tabular-nums">{t('quoted')}: {format.number(l.quotedAmount, { style: 'currency', currency: l.quotedCurrency ?? 'TRY', maximumFractionDigits: 0 })}</span> : null}
      </div>
      {l.message ? (
        <section className="grid gap-2" aria-labelledby="q-msg">
          <h2 id="q-msg" className="text-[length:var(--fs-h4)]">{t('message')}</h2>
          <p className="whitespace-pre-wrap text-[length:var(--fs-sm)]">{l.message}</p>
        </section>
      ) : null}
      {l.items.length > 0 ? (
        <section className="grid gap-3" aria-labelledby="q-items">
          <h2 id="q-items" className="text-[length:var(--fs-h4)]">{t('itemsTitle')}</h2>
          <div className="account-table-wrap">
            <table className="account-table">
              <thead><tr><th scope="col">{t('product')}</th><th scope="col" className="num">{t('qty')}</th><th scope="col">{t('note')}</th></tr></thead>
              <tbody>
                {l.items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.productName}{i.variantLabel ? <span className="block text-[length:var(--fs-xs)] text-[var(--color-text-muted)]">{i.variantLabel}{i.stockCode ? ` · ${i.stockCode}` : ''}</span> : null}
                      {Object.keys(i.attributes).length > 0 ? <span className="block text-[length:var(--fs-xs)] text-[var(--color-text-muted)]">{Object.entries(i.attributes).map(([k, v]) => `${k}: ${v}`).join(' · ')}</span> : null}</td>
                    <td className="num">{format.number(i.quantity)} {i.unit ?? ''}</td>
                    <td>{i.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      <section className="grid gap-3" aria-labelledby="q-replies">
        <h2 id="q-replies" className="text-[length:var(--fs-h4)]">{t('replies')}</h2>
        {l.replies.length === 0 ? <p className="text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">{t('noReplies')}</p> : (
          <ol className="account-thread">
            {l.replies.map((r) => (
              <li key={r.id} className="account-msg" data-dir={r.direction}>
                <p className="account-msg-meta"><strong>{r.direction === 'inbound' ? t('you') : t('company')}</strong> · {r.kind !== 'reply' ? `${t(`kinds.${r.kind === 'revision_request' ? 'revision_request' : 'cancel_request'}`)} · ` : ''}{format.dateTime(new Date(r.createdAt), { dateStyle: 'medium', timeStyle: 'short' })}</p>
                {r.direction === 'outbound' ? <p className="font-medium">{r.subject}</p> : null}
                <p className="whitespace-pre-wrap">{r.body}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
      <section className="grid gap-3 border-t border-[var(--color-border)] pt-6" aria-labelledby="q-form">
        <h2 id="q-form" className="text-[length:var(--fs-h4)]">{t('send')}</h2>
        <AccountForm
          action={sendLeadMessage}
          hidden={{ leadId: l.id }}
          submitLabel={t('send')}
          doneMessage={t('sent')}
          refreshOnDone
          fields={[
            { name: 'kind', label: t('kind'), type: 'select', options: kinds.map((k) => ({ value: k, label: t(`kinds.${k}`) })), defaultValue: 'reply' },
            { name: 'body', label: t('body'), type: 'textarea', rows: 5 },
          ]}
        />
      </section>
    </div>
  );
}
