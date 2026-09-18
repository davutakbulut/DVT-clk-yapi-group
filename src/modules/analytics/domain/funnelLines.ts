import type { FunnelStepInput } from '../data/adminFunnelsRepository';

/** Huni satırları: "ad | tür | değer"; tür path/path_prefix/event. Geçersiz satır düşer; en az bir adım şart. */
export function parseFunnelSteps(text: string): FunnelStepInput[] {
  return text
    .split('\n')
    .map((l) => l.split('|').map((p) => p.trim()))
    .filter((p) => p[0] && p[2])
    .flatMap((p) => {
      const type = p[1] === 'path' || p[1] === 'path_prefix' || p[1] === 'event' ? p[1] : null;
      if (!type) return [];
      return [{ name: p[0]!.slice(0, 80), matchType: type, matchValue: p[2]!.slice(0, 300) }];
    });
}

