import { notFound } from 'next/navigation';

// /tr/olmayan-sayfa hiçbir route'a uymaz → Next kök not-found'a (dilsiz, menüsüz) düşerdi.
// Bu yakalayıcı onu dilli 404'e çevirir. (Faz 1 deney #2)
export default function CatchAllPage() {
  notFound();
}
