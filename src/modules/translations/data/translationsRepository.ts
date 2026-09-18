type Messages = Record<string, unknown>;

/** Mesaj ağacı → düz liste (admin arama tablosu). */
export function flattenMessages(messages: Messages, prefix = ''): { key: string; value: string }[] {
  const out: { key: string; value: string }[] = [];
  for (const [k, v] of Object.entries(messages)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out.push({ key: path, value: v });
    else if (typeof v === 'object' && v !== null) out.push(...flattenMessages(v as Messages, path));
  }
  return out;
}
