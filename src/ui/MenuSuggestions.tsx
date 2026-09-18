import { Link, type AppHref } from '@/i18n/navigation';

interface Item {
  readonly id: string;
  readonly label: string;
  readonly link: { readonly kind: string; readonly pathname?: string };
}

/** Hata sayfasındaki "popüler sayfalar" listesi: yalnız iç bağlantılar. */
export function MenuSuggestions({ items }: { readonly items: readonly Item[] }) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
      {items.map((item) =>
        item.link.pathname ? (
          <li key={item.id}>
            <Link href={item.link.pathname as AppHref} className="underline underline-offset-4">
              {item.label}
            </Link>
          </li>
        ) : null,
      )}
    </ul>
  );
}
