// Çerez adı "sb-<project-ref>-auth-token", ~3 KB üstünde ".0 .1 .2" diye PARÇALANIR (Faz 1 deney #3).
// K-104: ad, kendi projemizin ref'ine sabitlenir (NEXT_PUBLIC_SUPABASE_URL ana bilgisayarının ilk parçası; yerelde "127" vb.).
// Rastgele "sb-x-auth-token" çerezi taşıyan istekler böylece her sayfada Supabase Auth'a gidip sunucu IP'sinin kotasını yakamaz.
function projectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname.split('.')[0] ?? null;
  } catch {
    return null;
  }
}
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function hasAuthCookie(cookieNames: readonly string[]): boolean {
  const ref = projectRef();
  const pattern = ref ? new RegExp(`^sb-${escape(ref)}-auth-token(\\.\\d+)?$`) : /^sb-.+-auth-token(\.\d+)?$/;
  return cookieNames.some((name) => pattern.test(name));
}
