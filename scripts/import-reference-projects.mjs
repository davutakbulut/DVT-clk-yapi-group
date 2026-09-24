#!/usr/bin/env node
/**
 * Referans (projeler.html) dosyasındaki iki gerçek, tasarım aşamasındaki projeyi veritabanına yazar (K-106).
 * Migration'da tutulmaz: gerçek-veri tabloları (projects) referans verisinde boş başlar (conventions.test). Yer tutucu "[Proje adı]"
 * satırları alınmaz (K-75: uydurma proje yok). Yeniden çalıştırılabilir: slug varsa atlar.
 *   node --env-file=.env.local scripts/import-reference-projects.mjs
 */
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const PROJECTS = [
  { slug: { tr: 'iki-katli-celik-villa-kastamonu', en: 'two-storey-steel-villa-kastamonu' }, title: { tr: 'İki Katlı Çelik Villa', en: 'Two-Storey Steel Villa' },
    excerpt: { tr: "TBDY 2018 ve Çelik Yapılar Yönetmeliği'ne göre kesit tasarımı; mod birleştirme analizi ve düzensizlik kontrolleri tamamlandı.", en: 'Section design to TBDY 2018 and the Steel Structures Code; modal analysis and irregularity checks completed.' },
    body: { tr: "İki katlı müstakil villa için çelik taşıyıcı sistem tasarımı. Kesitler TBDY 2018 ve Çelik Yapılar Yönetmeliği'ne göre boyutlandırıldı; ProtaStructure ile mod birleştirme analizi yapıldı, düzensizlik kontrolleri tamamlandı. Proje tasarım aşamasındadır; imalat ve montaj takvimi ruhsat sonrası netleşecek.", en: 'Steel frame design for a two-storey detached villa. Sections were sized to TBDY 2018 and the Steel Structures Code; modal analysis was carried out in ProtaStructure and irregularity checks completed. The project is at the design stage; the fabrication and erection schedule will follow the permit.' },
    location: { tr: 'Taşköprü, Kastamonu', en: 'Taşköprü, Kastamonu' }, drawing_key: 'konut', category: 'celik-konut-ve-villa', service: 'celik-konut-ve-villa', sort_order: 1 },
  { slug: { tr: 'cami-celik-kirma-cati-basaksehir', en: 'mosque-steel-hipped-roof-basaksehir' }, title: { tr: 'Cami Çelik Kırma Çatı', en: 'Mosque Steel Hipped Roof' },
    excerpt: { tr: 'Dört yana eğimli sıcak haddelenmiş çelik çatı; 5 m makas aralığı, 1 m aşık aralığı, kolay birleşim detayları.', en: 'Four-way pitched hot-rolled steel roof; 5 m truss spacing, 1 m purlin spacing, simple connection details.' },
    body: { tr: 'Cami için dört yana eğimli (kırma) sıcak haddelenmiş çelik çatı tasarımı. Makas aralığı 5 m, aşık aralığı 1 m; birleşimler sahada kolay uygulanacak biçimde detaylandırıldı. Proje tasarım aşamasındadır.', en: 'Design of a four-way pitched (hipped) hot-rolled steel roof for a mosque. Truss spacing 5 m, purlin spacing 1 m; connections are detailed for easy site assembly. The project is at the design stage.' },
    location: { tr: 'Başakşehir, İstanbul', en: 'Başakşehir, Istanbul' }, drawing_key: 'cati', category: 'cati-ve-cephe', service: 'celik-cati-ve-cephe-sistemleri', sort_order: 2 },
];
for (const p of PROJECTS) {
  const { data: exists } = await s.from('projects').select('id').eq('slug->>tr', p.slug.tr).maybeSingle();
  if (exists) { console.log(`${p.slug.tr}: zaten var, atlandı`); continue; }
  const { category, service, ...row } = p;
  const { data, error } = await s.from('projects').insert({ ...row, phase: 'design', year: 2026, status: 'published', published_locales: ['tr'], published_at: new Date().toISOString(), is_featured: false }).select('id').single();
  if (error) throw new Error(error.message);
  const [{ data: cat }, { data: svc }] = await Promise.all([s.from('project_categories').select('id').eq('slug->>tr', category).maybeSingle(), s.from('services').select('id').eq('slug->>tr', service).maybeSingle()]);
  if (cat) await s.from('project_category_relations').insert({ project_id: data.id, category_id: cat.id });
  if (svc) await s.from('service_projects').insert({ service_id: svc.id, project_id: data.id });
  console.log(`${p.slug.tr}: eklendi (tasarım aşaması, 2026)`);
}
