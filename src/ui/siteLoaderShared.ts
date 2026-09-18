// İstemci ve sunucu ortak sabitleri ('use client' dosyasından dışa aktarılan değer sunucu bileşeninde referansa dönüşür).
export const LOADER_SESSION_KEY = 'clk:loaded';
/** Hero videosu indirme ilerlemesi (HeroVideo yayınlar): detail = 0..1, 1 = hazır ya da video yok. */
export const HERO_PROGRESS_EVENT = 'clk:hero-progress';

/**
 * Gövdenin EN BAŞINA konur (boyamadan önce çalışır): ilk giriş + otomasyon değil → `html.clk-loading`.
 * `?clk_loader=1` yalnız gözle/E2E doğrulama için zorlar.
 */
export const SITE_LOADER_BOOT = `(function(){try{var f=location.search.indexOf('clk_loader=1')>-1;if(f||(!sessionStorage.getItem('${LOADER_SESSION_KEY}')&&!navigator.webdriver))document.documentElement.classList.add('clk-loading')}catch(e){}})()`;
