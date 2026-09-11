import { useEffect, useState } from 'react';
import { analyticsTraffic, setAnalyticsContext, setAnalyticsTransport, observeAnalyticsSurfaces, type AccountState } from './analytics';

const measurementId = (import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim();
const configured = /^G-[A-Z0-9]+$/.test(measurementId);
const consentKey = 'breezier-days.analytics-consent.v1';
type Choice = 'granted' | 'denied' | null;
type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
let initialized = false;
let lastPage = '';

function readConsent(): Choice {
  try {
    const saved = localStorage.getItem(consentKey);
    return saved === 'granted' || saved === 'denied' ? saved : null;
  } catch { return null; }
}

function trackPage(page: string) {
  if (!configured) return;
  const target = window as AnalyticsWindow;
  if (!initialized) {
    target.dataLayer = target.dataLayer || [];
    target.gtag = function () { target.dataLayer!.push(arguments); };
    target.gtag('consent', 'default', {
      analytics_storage: 'granted', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied',
    });
    target.gtag('js', new Date());
    target.gtag('config', measurementId, {
      ...analyticsTraffic(), send_page_view: false, allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: window.location.origin + '/', page_referrer: '',
    });
    const script = document.createElement('script');
    script.id = 'breezier-days-ga';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.onerror = () => console.warn('Breezier Days: Google Analytics script was blocked or could not load.');
    document.head.appendChild(script);
    initialized = true;
  }
  if (lastPage === page) return;
  lastPage = page;
  target.gtag!('event', 'page_view', {
    ...analyticsTraffic(), send_to: measurementId,
    page_title: `Breezier Days — ${page}`,
    page_location: `${window.location.origin}/${page === 'home' ? '' : page}`,
    page_referrer: '',
  });
}

export default function AnalyticsConsent({ page, accountState = 'unknown' }: { page: 'home' | 'help' | 'explore' | 'saved'; accountState?: AccountState }) {
  const [choice, setChoice] = useState<Choice>(readConsent);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    setAnalyticsContext(page, accountState);
    if (choice === 'granted' && configured) {
      trackPage(page);
      setAnalyticsTransport((event, params) => {
        (window as AnalyticsWindow).gtag!('event', event, {
          ...params, send_to: measurementId,
          page_title: `Breezier Days — ${page}`,
          page_location: `${window.location.origin}/${page === 'home' ? '' : page}`,
          page_referrer: '',
        });
      });
    } else setAnalyticsTransport(null);
  }, [choice, page, accountState]);
  useEffect(() => {
    if (choice !== 'granted' || !configured) return;
    return observeAnalyticsSurfaces();
  }, [choice, page]);
  useEffect(() => {
    const syncConsent = (event: StorageEvent) => {
      if (event.key !== consentKey && event.key !== null) return;
      if (initialized && readConsent() !== 'granted') { setAnalyticsTransport(null); window.location.reload(); }
      else setChoice(readConsent());
    };
    window.addEventListener('storage', syncConsent);
    return () => window.removeEventListener('storage', syncConsent);
  }, []);
  if (!configured) return null;
  const choose = (next: Exclude<Choice, null>) => {
    if (next === 'denied') setAnalyticsTransport(null);
    try { localStorage.setItem(consentKey, next); } catch { /* Keep the choice for this visit. */ }
    setChoice(next);
    setSettingsOpen(false);
    if (next === 'denied' && initialized) {
      // Stop the loaded tag immediately, then unload it by refreshing the document.
      (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = true;
      for (const cookie of document.cookie.split(';')) {
        const name = cookie.trim().split('=')[0];
        if (!/^_ga(?:_|$)/.test(name)) continue;
        for (const domain of ['', `; domain=${window.location.hostname}`]) {
          document.cookie = `${name}=; Max-Age=0; path=/${domain}`;
        }
      }
      window.location.reload();
    }
  };
  return <>
    <button type="button" className="analytics-settings" onClick={() => setSettingsOpen(true)}>Cookie settings</button>
    {(choice === null || settingsOpen) && <section className="analytics-consent" aria-label="Analytics cookie preferences">
      <strong>Optional analytics cookies</strong>
      <p>Allow Google Analytics to measure visits and navigation so we can improve Breezier Days? We do not send child profiles, questions, notes, or saved answers. Analytics stays off until you accept. Change your choice anytime in Cookie settings.</p>
      <div>
        <button type="button" onClick={() => choose('denied')}>Reject analytics</button>
        <button type="button" onClick={() => choose('granted')}>Accept analytics</button>
      </div>
    </section>}
  </>;
}
