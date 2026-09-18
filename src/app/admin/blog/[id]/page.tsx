import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, StatusBadge } from '@/modules/admin-shell';
import { PostForm } from '@/modules/blog';
import { getPostForAdmin, listPostChoices } from '@/modules/blog/server';

export default async function EditPostPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const [t, gate, { id }] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor']), params]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [post, choices] = await Promise.all([getPostForAdmin(id), listPostChoices(id)]);
  if (!post.ok || !choices.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  if (!post.data) notFound();
  const c = choices.data;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={post.data.title['tr'] || t('form.untitled')} action={{ href: '/admin/blog', label: t('form.back') }} />
      <StatusBadge status={post.data.status} locales={post.data.published_locales} />
      <PostForm post={post.data} images={c.images} categories={c.categories} tags={c.tags} authors={c.authors} otherKeywords={c.otherKeywords} otherIntros={c.otherIntros} />
    </div>
  );
}
