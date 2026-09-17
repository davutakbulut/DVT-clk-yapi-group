import { NotFoundContent } from '@/ui/NotFoundContent';

// (marketing) dışındaki route gruplarının (ör. konfigüratör) düştüğü dilli 404.
export default function LocaleNotFound() {
  return (
    <main id="main-content">
      <NotFoundContent />
    </main>
  );
}
