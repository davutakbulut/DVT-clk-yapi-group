'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FAMILY_KEYS, FAMILY_KIND, type Catalog, type CatalogRow, type FamilyKey, type ProfileKind } from '../../engine/catalog';

interface Props {
  readonly catalog: Catalog;
  /** Seçim yapılan profil alanı (null → yalnız gezinti) */
  readonly target: { readonly id: string; readonly label: string; readonly families: readonly FamilyKey[]; readonly current: string } | null;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onPick: (fieldId: string, code: string) => void;
  readonly fmt: (v: number, d?: number) => string;
  readonly fmtAuto: (v: number) => string;
}

const COLS: Record<ProfileKind, readonly (readonly [keyof CatalogRow['dims'], string])[]> = {
  I: [['h', 'h'], ['b', 'b'], ['tw', 'tw'], ['tf', 'tf'], ['r', 'r']],
  U: [['h', 'h'], ['b', 'b'], ['tw', 'tw'], ['tf', 'tf'], ['r', 'r']],
  C: [['h', 'h'], ['b', 'b'], ['t', 't']],
  L: [['h', 'a'], ['b', 'b'], ['t', 't'], ['r', 'r']],
  RHS: [['h', 'h'], ['b', 'b'], ['t', 't']],
  CHS: [['h', 'D'], ['t', 't']],
  FL: [['b', 'b'], ['t', 't']],
};
const PROPS: readonly (readonly [string, string, string, number | null])[] = [['A', 'A', 'cm²', 2], ['G', 'G', 'kg/m', 2], ['Iy', 'Iy', 'cm⁴', null], ['Wely', 'Wel,y', 'cm³', null], ['Wply', 'Wpl,y', 'cm³', null], ['iy', 'iy', 'cm', 2],
  ['Iz', 'Iz', 'cm⁴', null], ['Welz', 'Wel,z', 'cm³', null], ['Wplz', 'Wpl,z', 'cm³', null], ['iz', 'iz', 'cm', 2], ['It', 'It ≈', 'cm⁴', null], ['AL', 'AL', 'm²/m', 3]];
const L_PROPS: readonly (readonly [string, string, string, number | null])[] = [['Iu', 'Iu', 'cm⁴', null], ['Iv', 'Iv', 'cm⁴', null], ['iv', 'iv', 'cm', 2]];

/** Profil kataloğu penceresi: aile sekmeleri, arama, kesit değerleri tablosu; bir alan için açıldıysa satır seçimi. */
export function CatalogDialog({ catalog, target, open, onClose, onPick, fmt, fmtAuto }: Props) {
  const t = useTranslations('Engine');
  const ref = useRef<HTMLDialogElement>(null);
  const fams = useMemo(() => (target ? target.families : FAMILY_KEYS).filter((f) => catalog.ofFamilies([f]).length > 0), [target, catalog]);
  const [fam, setFam] = useState<FamilyKey>(fams[0] ?? 'IPE');
  const [q, setQ] = useState('');
  useEffect(() => {
    if (!open) return;
    const initial = target && catalog.has(target.current) ? catalog.get(target.current).family : fams[0];
    if (initial && fams.includes(initial)) setFam(initial);
    setQ('');
  }, [open, target, fams, catalog]);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const needle = q.trim().toLocaleLowerCase('tr-TR');
  const matches = (p: CatalogRow) => !needle || p.label.toLocaleLowerCase('tr-TR').includes(needle) || p.code.toLocaleLowerCase('en-US').includes(needle);
  const list = catalog.ofFamilies([fam]).filter(matches);
  const kind = FAMILY_KIND[fam];
  const cols = COLS[kind], props = kind === 'L' ? [...PROPS, ...L_PROPS] : PROPS;
  const onSearch = (v: string) => {
    setQ(v);
    const n = v.trim().toLocaleLowerCase('tr-TR');
    if (n && !catalog.ofFamilies([fam]).some((p) => p.label.toLocaleLowerCase('tr-TR').includes(n))) {
      const hit = fams.find((f) => catalog.ofFamilies([f]).some((p) => p.label.toLocaleLowerCase('tr-TR').includes(n)));
      if (hit) setFam(hit);
    }
  };
  return (
    <dialog ref={ref} className="engine-catalog" aria-labelledby="engine-catalog-title" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="engine-catalog-box">
        <div className="engine-catalog-head">
          <h3 id="engine-catalog-title">
            {t('catalog.title')}
            <small>{target ? t('catalog.pickFor', { field: target.label }) : t('catalog.browse')}</small>
          </h3>
          <input type="search" value={q} onChange={(e) => onSearch(e.target.value)} placeholder={t('catalog.search')} aria-label={t('catalog.search')} />
          <button type="button" className="engine-ibtn" onClick={onClose}>{t('catalog.close')}</button>
        </div>
        <div className="engine-catalog-tabs" role="tablist">
          {fams.map((f) => (
            <button key={f} type="button" role="tab" aria-selected={fam === f} className={fam === f ? 'on' : ''} onClick={() => setFam(f)}>{t(`families.${f}.label`)}</button>
          ))}
        </div>
        <p className="engine-catalog-desc">{t(`families.${fam}.desc`)}</p>
        <div className="engine-catalog-body">
          <table className="engine-catalog-table">
            <thead>
              <tr>
                <th scope="col">{t('catalog.profile')}</th>
                {cols.map(([k, l]) => <th key={k} scope="col">{l}<small>mm</small></th>)}
                {props.map(([k, l, u]) => <th key={k} scope="col">{l}<small>{u}</small></th>)}
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const pr = catalog.get(p.code).props as unknown as Record<string, number | undefined>;
                const cur = target?.current === p.code;
                return (
                  <tr key={p.code} className={`${target ? 'pick' : ''}${cur ? ' cur' : ''}`} onClick={() => { if (target) { onPick(target.id, p.code); onClose(); } }} tabIndex={target ? 0 : -1} onKeyDown={(e) => { if (target && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onPick(target.id, p.code); onClose(); } }} aria-selected={target ? cur : undefined}>
                    <th scope="row">{p.label}</th>
                    {cols.map(([k]) => { const v = p.dims[k]; return <td key={k}>{v === undefined ? '–' : fmt(v, v % 1 ? 1 : 0)}</td>; })}
                    {props.map(([k, , , d]) => { const v = pr[k]; return <td key={k}>{v === undefined ? '–' : d !== null ? fmt(v, d) : fmtAuto(v)}</td>; })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="engine-catalog-foot">{t('catalog.legend')}</p>
      </div>
    </dialog>
  );
}
