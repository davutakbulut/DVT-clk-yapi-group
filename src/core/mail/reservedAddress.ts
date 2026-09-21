/** example.com/.net/.org ve .test/.example/.invalid/.localhost (RFC 2606/6761): gerçek teslimat yapılamayan, teste ayrılmış adresler. Saf yardımcı. */
export function isReservedTestAddress(email: string): boolean {
  const domain = email.trim().split('@').pop()?.toLocaleLowerCase('en-US') ?? '';
  return /(^|\.)example\.(com|net|org)$/.test(domain) || /\.(test|example|invalid|localhost)$/.test(domain);
}
