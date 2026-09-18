'use client';

import { useEffect, useState } from 'react';
import { readConsentFromDocument } from '@/modules/consent';

interface Props {
  readonly ga4Id: string;
  readonly adsId: string;
  readonly metaPixelId: string;
}

/**
 * K-39: GA4 / Google Ads / Meta Pixel yalnız ilgili onay varsa yüklenir (analitik → GA4; pazarlama → Ads + Pixel).
 * Onay sonradan verilirse `clk:consent` olayıyla yüklenir; reddedilince script hiç eklenmez (kaldırma gerekmez).
 */
export function ThirdPartyScripts({ ga4Id, adsId, metaPixelId }: Props) {
  const [consent, setConsent] = useState<{ analytics: boolean; marketing: boolean } | null>(null);
  useEffect(() => {
    const read = () => {
      const c = readConsentFromDocument();
      setConsent(c ? { analytics: c.analytics, marketing: c.marketing } : null);
    };
    read();
    window.addEventListener('clk:consent', read);
    return () => window.removeEventListener('clk:consent', read);
  }, []);

  useEffect(() => {
    if (!consent) return;
    const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; fbq?: (...args: unknown[]) => void; _fbq?: unknown; __clkGtag?: boolean; __clkPixel?: boolean };
    const gtagIds = [consent.analytics ? ga4Id : '', consent.marketing ? adsId : ''].filter(Boolean);
    if (gtagIds.length > 0 && !w.__clkGtag) {
      w.__clkGtag = true;
      w.dataLayer = w.dataLayer ?? [];
      w.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params -- gtag imzası arguments ister
        w.dataLayer!.push(arguments);
      };
      w.gtag('js', new Date());
      w.gtag('consent', 'default', { analytics_storage: consent.analytics ? 'granted' : 'denied', ad_storage: consent.marketing ? 'granted' : 'denied', ad_user_data: consent.marketing ? 'granted' : 'denied', ad_personalization: consent.marketing ? 'granted' : 'denied' });
      for (const id of gtagIds) w.gtag('config', id, { anonymize_ip: true });
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gtagIds[0]!)}`;
      document.head.appendChild(s);
    }
    if (consent.marketing && metaPixelId && !w.__clkPixel) {
      w.__clkPixel = true;
      const queue: unknown[][] = [];
      const fbq = function fbq(...args: unknown[]) {
        queue.push(args);
      } as ((...args: unknown[]) => void) & { queue?: unknown[][]; loaded?: boolean; version?: string; push?: unknown };
      fbq.queue = queue;
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.push = fbq;
      w.fbq = fbq;
      w._fbq = fbq;
      w.fbq('init', metaPixelId);
      w.fbq('track', 'PageView');
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(s);
    }
  }, [consent, ga4Id, adsId, metaPixelId]);

  return null;
}
