import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

/**
 * Her E2E koşusunun sonunda testlerin bıraktığı kayıtlar silinir (scripts/purge-e2e-data.mjs --apply):
 * proje tek veritabanı kullanır, artıklar panelde "E2E …" satırları olarak görünüyordu. Sır yoksa (CI) sessizce atlanır.
 */
export default function globalTeardown(): void {
  if (!existsSync('.env.local')) return;
  try {
    const out = execFileSync('node', ['--env-file=.env.local', 'scripts/purge-e2e-data.mjs', '--apply'], { encoding: 'utf8' });
    const touched = out.split('\n').filter((l) => /silindi/.test(l));
    if (touched.length) console.log(`[e2e temizlik]\n${touched.join('\n')}`);
  } catch (e) {
    console.warn('[e2e temizlik] atlandı:', e instanceof Error ? e.message.slice(0, 200) : e);
  }
}
