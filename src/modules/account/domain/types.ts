/** Hesabım (K-103): sekmeler, talep durumları, müşteri mesaj türleri. İçerik metinleri messages/Account altında. */
export const ACCOUNT_TABS = ['overview', 'quotes', 'configurations', 'basket', 'profile', 'security', 'notifications', 'data'] as const;
export type AccountTab = (typeof ACCOUNT_TABS)[number];
export type AccountHref = '/account' | '/account/quotes' | '/account/configurations' | '/account/basket' | '/account/profile' | '/account/security' | '/account/notifications' | '/account/data';
export const TAB_HREF: Readonly<Record<AccountTab, AccountHref>> = {
  overview: '/account',
  quotes: '/account/quotes',
  configurations: '/account/configurations',
  basket: '/account/basket',
  profile: '/account/profile',
  security: '/account/security',
  notifications: '/account/notifications',
  data: '/account/data',
};
export const LEAD_STATUSES = ['new', 'in_review', 'quoted', 'won', 'lost'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const isLeadStatus = (v: string): v is LeadStatus => (LEAD_STATUSES as readonly string[]).includes(v);
export const MESSAGE_KINDS = ['reply', 'revision_request', 'cancel_request'] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];
/** Header hesap menüsünün yayınladığı oturum özeti olayı (istemci; ikinci /api/me isteği atılmaz). */
export const ME_EVENT = 'clk:me';
export interface MeSummary { readonly name: string; readonly isStaff: boolean }
export const DELETE_CONFIRM_WORDS = ['SİL', 'SIL', 'DELETE'] as const; // static-ok: onay sözcükleri (Account.security.confirmWord metniyle eşleşir), içerik değil
