import { getSiteUrl } from '@/core/config/site';
import type { JsonLdObject } from './jsonLd';

export interface OrganizationInput {
  readonly name: string;
  readonly description?: string | null;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly address?: string | null;
  readonly logoUrl?: string | null;
  readonly sameAs?: readonly string[];
  readonly locale: string;
}

/** Kök Organization + GeneralContractor (02-SEO). `@id` = site#organization; Service/Article bu kimliğe referans verir. */
export function organizationJsonLd(input: OrganizationInput): JsonLdObject {
  const origin = getSiteUrl().origin;
  return {
    '@type': ['Organization', 'GeneralContractor'],
    '@id': `${origin}/#organization`,
    name: input.name,
    url: origin,
    inLanguage: input.locale,
    ...(input.description ? { description: input.description } : {}),
    ...(input.logoUrl ? { logo: input.logoUrl, image: input.logoUrl } : {}),
    ...(input.phone ? { telephone: input.phone } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(input.address ? { address: { '@type': 'PostalAddress', streetAddress: input.address, addressCountry: 'TR' } } : {}),
    ...(input.sameAs && input.sameAs.length > 0 ? { sameAs: [...input.sameAs] } : {}),
  };
}

/** İletişim sayfası: LocalBusiness (yerel aramalar). Aynı NAP; Organization kimliğine bağlı. */
export function localBusinessJsonLd(input: OrganizationInput & { readonly openingHours?: string | null; readonly mapUrl?: string | null }): JsonLdObject {
  const origin = getSiteUrl().origin;
  return {
    '@type': 'LocalBusiness',
    '@id': `${origin}/#localbusiness`,
    parentOrganization: { '@id': `${origin}/#organization` },
    name: input.name,
    url: origin,
    inLanguage: input.locale,
    ...(input.phone ? { telephone: input.phone } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(input.address ? { address: { '@type': 'PostalAddress', streetAddress: input.address, addressCountry: 'TR' } } : {}),
    ...(input.openingHours ? { openingHours: input.openingHours } : {}),
    ...(input.mapUrl ? { hasMap: input.mapUrl } : {}),
    ...(input.logoUrl ? { image: input.logoUrl } : {}),
  };
}

/** WebSite düğümü (K-99): sitenin yayıncısı kuruluş, yaratıcısı (tasarım + yazılım) geliştirici. */
export function webSiteJsonLd(input: { readonly name: string; readonly locale: string; readonly developer: { readonly name: string; readonly url: string | null } | null }): JsonLdObject {
  const origin = getSiteUrl().origin;
  return {
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    name: input.name,
    url: origin,
    inLanguage: input.locale,
    publisher: { '@id': `${origin}/#organization` },
    ...(input.developer ? { creator: { '@type': 'Organization', name: input.developer.name, ...(input.developer.url ? { url: input.developer.url } : {}) } } : {}),
  };
}
