/**
 * RPC kapısı (K-104): sunucu istemcileri her PostgREST isteğine `x-clk-gate` başlığını ekler; veritabanındaki
 * yazma fonksiyonları ve anon INSERT politikaları bu başlığı ister (0052). Anon anahtarla doğrudan çağrı böylece kapanır.
 * RPC_GATE_SECRET tanımsızsa başlık gönderilmez (kapı veritabanında da yapılandırılmamışsa açık kalır).
 */
export function gateHeaders(): Record<string, string> {
  const secret = process.env['RPC_GATE_SECRET'];
  return secret ? { 'x-clk-gate': secret } : {};
}
