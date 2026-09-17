// Faz 1 deney #3: çerez adı "sb-<project-ref>-auth-token", ~3 KB üstünde ".0 .1 .2" diye PARÇALANIR.
// Tam ad eşleşmesi büyük oturumlu kullanıcıyı "çerezsiz" sayar → oturumu hiç yenilenmez.
// Proje ref'ine de sabitlenmez: yerelde (supabase start) ref farklıdır.
const AUTH_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;

export function hasAuthCookie(cookieNames: readonly string[]): boolean {
  return cookieNames.some((name) => AUTH_COOKIE.test(name));
}
