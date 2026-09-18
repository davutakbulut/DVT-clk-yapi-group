'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError, FormSection, LocalizedField, MediaSelect, PublishFields, type MediaOption } from '@/modules/admin-shell';
import { saveCertificate, saveClient, saveFaq, saveJobPosting, saveTeamMember, updateApplication } from '../../actions';
import type { AdminApplication, AdminCertificate, AdminClient, AdminFaq, AdminJobPosting, AdminTeamMember } from '../../data/adminCorporateRepository';

const publishValue = (v: { status: string; published_locales: readonly string[]; reviewedEn: boolean; slug?: Readonly<Partial<Record<string, string>>> | null } | null) => (v ? { status: v.status, published_locales: v.published_locales, reviewedEn: v.reviewedEn, slug: v.slug ?? null } : null);

function TextField({ name, label, value, type = 'text', state, required, extra }: { readonly name: string; readonly label: string; readonly value?: string | number | null; readonly type?: string; readonly state: { fieldErrors?: Readonly<Record<string, string>> }; readonly required?: boolean; readonly extra?: Record<string, unknown> }) {
  return (
    <div className="grid gap-1">
      <Label htmlFor={`f-${name}`}>{label}</Label>
      <Input id={`f-${name}`} name={name} type={type} defaultValue={value ?? ''} required={required} aria-invalid={state.fieldErrors?.[name] ? 'true' : undefined} {...extra} />
      <FieldError state={state as never} name={name} />
    </div>
  );
}

export function TeamMemberForm({ member, images }: { readonly member: AdminTeamMember | null; readonly images: readonly MediaOption[] }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveTeamMember, IDLE);
  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="id" value={member?.id ?? ''} />
      <ActionMessage state={state} />
      <FormSection title={t('corporate.team.title')}>
        <TextField name="fullName" label={t('corporate.team.fullName')} value={member?.full_name} state={state} required />
        <LocalizedField name="position" label={t('corporate.team.position')} value={member?.position} state={state} required />
        <LocalizedField name="bio" label={t('corporate.team.bio')} value={member?.bio} state={state} multiline rows={4} />
        <div className="grid gap-3 sm:grid-cols-3">
          <MediaSelect name="photoId" label={t('corporate.team.photo')} options={images} value={member?.photo_id} />
          <TextField name="email" label={t('corporate.team.email')} value={member?.email} type="email" state={state} />
          <TextField name="linkedinUrl" label={t('corporate.team.linkedin')} value={member?.linkedin_url} type="url" state={state} />
        </div>
      </FormSection>
      <PublishFields withSlug={false} state={state} value={publishValue(member)} />
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}

export function ClientForm({ client, images }: { readonly client: AdminClient | null; readonly images: readonly MediaOption[] }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveClient, IDLE);
  const k = client?.id ?? 'new';
  return (
    <form action={action} className="grid gap-4 rounded-md border bg-card p-4">
      <input type="hidden" name="id" value={client?.id ?? ''} />
      <ActionMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1">
          <Label htmlFor={`c-${k}-name`}>{t('corporate.references.name')}</Label>
          <Input id={`c-${k}-name`} name="name" defaultValue={client?.name ?? ''} required />
        </div>
        <MediaSelect name="logoId" label={t('corporate.references.logo')} options={images} value={client?.logo_id} />
        <div className="grid gap-1">
          <Label htmlFor={`c-${k}-website`}>{t('corporate.references.website')}</Label>
          <Input id={`c-${k}-website`} name="websiteUrl" type="url" defaultValue={client?.website_url ?? ''} />
          <FieldError state={state} name="websiteUrl" />
        </div>
      </div>
      <LocalizedField name="sector" label={t('corporate.references.sector')} value={client?.sector} state={state} />
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isFeatured" defaultChecked={client?.is_featured ?? false} /> {t('corporate.references.featured')}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isActive" defaultChecked={client?.is_active ?? true} /> {t('corporate.references.active')}
        </label>
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {client ? t('common.save') : t('common.add')}
        </Button>
      </div>
    </form>
  );
}

export function CertificateForm({ certificate, images, documents }: { readonly certificate: AdminCertificate | null; readonly images: readonly MediaOption[]; readonly documents: readonly MediaOption[] }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveCertificate, IDLE);
  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="id" value={certificate?.id ?? ''} />
      <ActionMessage state={state} />
      <FormSection title={t('corporate.certificates.title')}>
        <LocalizedField name="title" label={t('corporate.certificates.name')} value={certificate?.title} state={state} required />
        <LocalizedField name="description" label={t('corporate.certificates.description')} value={certificate?.description} state={state} multiline rows={3} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <TextField name="issuer" label={t('corporate.certificates.issuer')} value={certificate?.issuer} state={state} />
          <TextField name="certificateNo" label={t('corporate.certificates.no')} value={certificate?.certificate_no} state={state} />
          <TextField name="issuedOn" label={t('corporate.certificates.issuedOn')} value={certificate?.issued_on} type="date" state={state} />
          <TextField name="validUntil" label={t('corporate.certificates.validUntil')} value={certificate?.valid_until} type="date" state={state} />
          <MediaSelect name="imageId" label={t('corporate.certificates.image')} options={images} value={certificate?.image_id} />
          <MediaSelect name="documentId" label={t('corporate.certificates.document')} options={documents} value={certificate?.document_id} />
        </div>
      </FormSection>
      <PublishFields withSlug={false} state={state} value={publishValue(certificate)} />
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}

const TYPES = ['full_time', 'part_time', 'contract', 'internship'] as const;

export function JobPostingForm({ job }: { readonly job: AdminJobPosting | null }) {
  const t = useTranslations('Admin');
  const tc = useTranslations('Corporate');
  const [state, action, pending] = useActionState(saveJobPosting, IDLE);
  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="id" value={job?.id ?? ''} />
      <ActionMessage state={state} />
      <FormSection title={t('corporate.careers.title')}>
        <LocalizedField name="title" label={t('form.name')} value={job?.title} state={state} required />
        <div className="grid gap-3 sm:grid-cols-2">
          <LocalizedField name="department" label={t('corporate.careers.department')} value={job?.department} state={state} />
          <LocalizedField name="location" label={t('corporate.careers.location')} value={job?.location} state={state} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1">
            <Label htmlFor="f-employmentType">{t('corporate.careers.employmentType')}</Label>
            <select id="f-employmentType" name="employmentType" defaultValue={job?.employment_type ?? 'full_time'} className="h-9 rounded-md border bg-background px-2 text-sm">
              {TYPES.map((v) => (
                <option key={v} value={v}>
                  {tc(`types.${v}`)}
                </option>
              ))}
            </select>
          </div>
          <TextField name="applicationDeadline" label={t('corporate.careers.deadline')} value={job?.application_deadline} type="date" state={state} />
          <label className="flex items-center gap-2 self-end text-sm">
            <input type="checkbox" name="isOpen" defaultChecked={job?.is_open ?? true} /> {t('corporate.careers.open')}
          </label>
        </div>
        <LocalizedField name="description" label={t('corporate.careers.description')} value={job?.description} state={state} multiline rows={10} />
        <LocalizedField name="requirements" label={t('corporate.careers.requirements')} value={job?.requirements} state={state} multiline rows={6} />
      </FormSection>
      <FormSection title={t('corporate.careers.seo')}>
        <LocalizedField name="seoTitle" label={t('corporate.careers.seoTitle')} value={job?.seo_title} state={state} />
        <LocalizedField name="seoDescription" label={t('corporate.careers.seoDescription')} value={job?.seo_description} state={state} multiline rows={2} />
      </FormSection>
      <PublishFields state={state} value={publishValue(job)} />
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}

const APP_STATUSES = ['new', 'reviewing', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'] as const;

export function ApplicationStatusForm({ application }: { readonly application: AdminApplication }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(updateApplication, IDLE);
  const k = application.id;
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="id" value={k} />
      <ActionMessage state={state} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <Label htmlFor={`a-${k}-status`}>{t('corporate.applications.status')}</Label>
          <select id={`a-${k}-status`} name="status" defaultValue={application.status} className="h-9 rounded-md border bg-background px-2 text-sm">
            {APP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`corporate.applications.statuses.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid flex-1 gap-1">
          <Label htmlFor={`a-${k}-notes`}>{t('corporate.applications.notes')}</Label>
          <Textarea id={`a-${k}-notes`} name="internalNotes" rows={1} defaultValue={application.internal_notes ?? ''} />
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {t('corporate.applications.update')}
        </Button>
      </div>
    </form>
  );
}

export function FaqForm({ faq, entities }: { readonly faq: AdminFaq | null; readonly entities: readonly { value: string; label: string }[] }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveFaq, IDLE);
  const k = faq?.id ?? 'new';
  return (
    <form action={action} className="grid gap-4 rounded-md border bg-card p-4">
      <input type="hidden" name="id" value={faq?.id ?? ''} />
      <ActionMessage state={state} />
      <LocalizedField name="question" label={t('corporate.faq.question')} value={faq?.question} state={state} required />
      <LocalizedField name="answer" label={t('corporate.faq.answer')} value={faq?.answer} state={state} multiline rows={4} />
      <div className="grid gap-1 sm:max-w-md">
        <Label htmlFor={`q-${k}-entity`}>{t('corporate.faq.entity')}</Label>
        <select id={`q-${k}-entity`} name="entity" defaultValue={faq?.entity_type && faq.entity_id ? `${faq.entity_type}:${faq.entity_id}` : ''} className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="">{t('corporate.faq.general')}</option>
          {entities.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </div>
      <PublishFields withSlug={false} state={state} value={publishValue(faq)} />
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {faq ? t('common.save') : t('common.add')}
        </Button>
      </div>
    </form>
  );
}
