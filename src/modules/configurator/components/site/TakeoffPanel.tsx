'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import type { ProfileKey, Structure } from '../../domain/structure';
import { computeTakeoff, type PanelWeights, type WeightTable } from '../../domain/takeoff';

interface Props {
  readonly structure: Structure;
  readonly profileMap: Readonly<Record<ProfileKey, string>>;
  readonly weights: WeightTable;
  readonly panelWeights: PanelWeights;
}

/** Metraj tablosu (K-29: herkese açık). kg/m girilmemiş profiller "—" ve uyarı; tonaj yalnız bilinenlerin toplamı. */
export function TakeoffPanel({ structure, profileMap, weights, panelWeights }: Props) {
  const t = useTranslations('Configurator.takeoff');
  const format = useFormatter();
  const takeoff = useMemo(() => computeTakeoff(structure, profileMap, weights, panelWeights), [structure, profileMap, weights, panelWeights]);
  const n = (v: number, d = 1) => format.number(v, { maximumFractionDigits: d });
  const kg = (v: number | null) => (v === null ? '—' : `${n(v, 0)} kg`);
  return (
    <section className="grid gap-2" aria-labelledby="takeoff-title" data-testid="takeoff">
      <h2 id="takeoff-title" className="text-[length:var(--fs-h4)]">
        {t('title')}
      </h2>
      <table className="configurator-table">
        <thead>
          <tr>
            <th scope="col">{t('element')}</th>
            <th scope="col">{t('profile')}</th>
            <th scope="col" className="text-right">{t('pieces')}</th>
            <th scope="col" className="text-right">{t('length')}</th>
            <th scope="col" className="text-right">{t('weight')}</th>
          </tr>
        </thead>
        <tbody>
          {takeoff.lines.map((l) => (
            <tr key={`${l.group}-${l.profileCode}`}>
              <th scope="row">{t(`groups.${l.group}`)}</th>
              <td className="font-mono">{l.profileCode}</td>
              <td className="text-right tabular-nums">{l.pieces}</td>
              <td className="text-right tabular-nums">{n(l.totalLengthM)} m</td>
              <td className="text-right tabular-nums">{kg(l.totalWeightKg)}</td>
            </tr>
          ))}
          {takeoff.panels.map((p) => (
            <tr key={p.kind}>
              <th scope="row">{t(`panels.${p.kind}`)}</th>
              <td>—</td>
              <td className="text-right tabular-nums">{p.pieces}</td>
              <td className="text-right tabular-nums">{n(p.totalAreaM2)} m²</td>
              <td className="text-right tabular-nums">{kg(p.totalWeightKg)}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">{t('plates')}</th>
            <td>—</td>
            <td className="text-right tabular-nums">{takeoff.plates}</td>
            <td colSpan={2} />
          </tr>
          <tr>
            <th scope="row">{t('bolts')}</th>
            <td>—</td>
            <td className="text-right tabular-nums">{takeoff.bolts}</td>
            <td colSpan={2} />
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={4}>
              {t('steelTotal')}
            </th>
            <td className="text-right font-semibold tabular-nums" data-testid="tonnage">
              {takeoff.steelKg > 0 ? `${n(takeoff.steelKg / 1000, 2)} t` : '—'}
            </td>
          </tr>
        </tfoot>
      </table>
      {!takeoff.complete ? (
        <p className="configurator-warning text-[length:var(--fs-xs)]" role="status">
          {t('incomplete', { codes: takeoff.missingProfiles.join(', ') })}
        </p>
      ) : null}
    </section>
  );
}
