/** "platform | https://…" satırlarından liste; bozuk satır atlanır. */
export function parseSocialLines(text: string): { platform: string; url: string }[] {
  return text
    .split('\n')
    .map((line) => line.split('|').map((s) => s.trim()))
    .filter((parts): parts is [string, string] => parts.length === 2 && parts[0] !== '' && /^https?:\/\//.test(parts[1] ?? ''))
    .map(([platform, url]) => ({ platform, url }));
}

