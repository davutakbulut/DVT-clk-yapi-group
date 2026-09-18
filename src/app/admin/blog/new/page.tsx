import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { PostForm } from '@/modules/blog';
import { listPostChoices } from '@/modules/blog/server';

export default async function NewPostPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const choices = await listPostChoices();
  if (!choices.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  const c = choices.data;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('blog.new')} action={{ href: '/admin/blog', label: t('form.back') }} />
      <PostForm post={null} images={c.images} categories={c.categories} tags={c.tags} authors={c.authors} otherKeywords={c.otherKeywords} otherIntros={c.otherIntros} />
    </div>
  );
}
