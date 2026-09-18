'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { IDLE } from '@/lib/formState';
import { Button } from '@/ui/Button';
import { submitComment } from '../../actions';

interface Props {
  readonly postId: string;
  readonly locale: string;
}

/** Ziyaretçi yorumu: görünür etiketler, alanın yanında hata, bal küpü (website), JS'siz de gönderilir. */
export function CommentForm({ postId, locale }: Props) {
  const t = useTranslations('Blog');
  const [state, action, pending] = useActionState(submitComment, IDLE);
  const invalid = (name: string) => (state.fieldErrors?.[name] ? 'true' : undefined);

  if (state.done) {
    return (
      <p role="status" className="border-l-2 border-[var(--color-accent)] pl-4 text-[var(--color-text)]">
        {t('sent')}
      </p>
    );
  }
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="locale" value={locale} />
      <div className="hidden" aria-hidden="true">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state.error ? (
        <p role="alert" className="text-[var(--color-danger)]">
          {t(`errors.${state.error === 'notConfigured' ? 'notConfigured' : state.error === 'forbidden' ? 'forbidden' : state.error === 'validation' ? 'validation' : 'unexpected'}`)}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium">
          {t('name')}
          <input name="authorName" required minLength={2} maxLength={80} autoComplete="name" aria-invalid={invalid('authorName')} className="field" />
        </label>
        <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium">
          {t('email')}
          <input name="authorEmail" type="email" maxLength={200} autoComplete="email" aria-invalid={invalid('authorEmail')} className="field" />
        </label>
      </div>
      <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium">
        {t('body')}
        <textarea name="body" required minLength={2} maxLength={4000} rows={5} aria-invalid={invalid('body')} className="field" />
      </label>
      <div>
        <Button type="submit" disabled={pending}>
          {t('submit')}
        </Button>
      </div>
    </form>
  );
}
