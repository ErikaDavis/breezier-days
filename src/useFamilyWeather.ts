import { useEffect, useRef, useState } from 'react';
import { coarseArea, getAreaWeather, readWeatherPreference, weatherJson, weatherPreferenceKey, type FamilyWeather, type WeatherArea, type WeatherPreference } from './familyWeather';

export function useFamilyWeather() {
  const [weather, setWeather] = useState<FamilyWeather | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [preference, setPreference] = useState(readWeatherPreference);
  const [candidates, setCandidates] = useState<WeatherArea[]>([]);
  const pref = useRef(preference);
  const current = useRef(weather);
  const sequence = useRef(0);
  const lastAttempt = useRef(0);
  const save = (next: WeatherPreference) => {
    pref.current = next; setPreference(next);
    try { localStorage.setItem(weatherPreferenceKey, JSON.stringify(next)); }
    catch { setMessage('Weather works now, but this browser could not remember your area for next time.'); }
  };
  const load = async (area: WeatherArea, id: number) => {
    try {
      const next = await getAreaWeather(area);
      if (id === sequence.current) { current.current = next; setWeather(next); }
    } catch {
      if (id === sequence.current) { setMessage('Weather is unavailable right now. Your daily ideas still work.'); setServiceError('Weather unavailable'); }
    } finally { if (id === sequence.current) setLoading(false); }
  };
  const begin = () => {
    lastAttempt.current = Date.now(); setLoading(true); setMessage(''); setServiceError(null); setCandidates([]);
    return ++sequence.current;
  };
  const useDevice = (explicit = true) => {
    const id = begin();
    if (!navigator.geolocation) { setLoading(false); setMessage('Location is unavailable here. Choose a city instead.'); return; }
    navigator.geolocation.getCurrentPosition(position => {
      if (id !== sequence.current) return;
      const area = coarseArea(position.coords.latitude, position.coords.longitude);
      save({ mode: 'device', area });
      void load(area, id);
    }, error => {
      if (id !== sequence.current) return;
      setLoading(false);
      if (error.code === 1) {
        save({ mode: 'manual', area: pref.current?.area ?? null });
        setMessage('Location is not allowed. Choose a city, or enable location in your browser settings.');
      } else setMessage('Could not find your location. Choose a city or try again.');
      if (!explicit && pref.current?.area) void load(pref.current.area, id);
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
  };
  const permission = async (): Promise<PermissionState | 'unknown'> => {
    try { return (await navigator.permissions.query({ name: 'geolocation' })).state; }
    catch { return 'unknown'; }
  };
  const refresh = async (force = false) => {
    if (document.visibilityState !== 'visible' || !navigator.onLine) return;
    if (!force && (Date.now() - lastAttempt.current < 60000 || (current.current && Date.now() - current.current.receivedAt < 1800000))) return;
    const before = sequence.current;
    const saved = pref.current;
    const state = saved?.mode === 'manual' ? 'unknown' : await permission();
    if (before !== sequence.current) return;
    // Only explicit clicks may cause a prompt. Unknown/prompt states use the
    // previously approved coarse area, especially on iOS/one-time permissions.
    if (state === 'granted' && saved?.mode !== 'manual') { useDevice(false); return; }
    if (saved?.area) {
      const id = begin();
      if (state === 'denied' && saved.mode === 'device') {
        save({ mode: 'manual', area: saved.area });
        setMessage('Using your saved area. Location access is off; change the area if needed.');
      }
      void load(saved.area, id);
    }
  };
  const choose = (area: WeatherArea) => {
    const id = begin(); const coarse = coarseArea(area.latitude, area.longitude, area.name);
    save({ mode: 'manual', area: coarse }); void load(coarse, id);
  };
  const search = async (query: string) => {
    if (query.trim().length < 2) { setMessage('Enter a city or ZIP/postal code.'); return; }
    const id = begin();
    try {
      const data = await weatherJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=5&language=en&format=json`);
      if (id !== sequence.current) return;
      const found: WeatherArea[] = (data.results ?? []).filter((r: any) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude)).map((r: any) => coarseArea(r.latitude, r.longitude, [r.name, r.admin1, r.country].filter(Boolean).join(', ')));
      setCandidates(found);
      if (!found.length) setMessage('No places found. Try the nearest city and country.');
    } catch { if (id === sequence.current) { setMessage('Location search is unavailable. Try again shortly.'); setServiceError('Weather unavailable'); } }
    finally { if (id === sequence.current) setLoading(false); }
  };
  const forget = () => {
    sequence.current++; pref.current = { mode: 'manual', area: null }; current.current = null;
    setWeather(null); setCandidates([]); setLoading(false); setMessage(''); setServiceError(null);
    save({ mode: 'manual', area: null });
  };
  const refreshRef = useRef(refresh); refreshRef.current = refresh;
  useEffect(() => {
    let active = true;
    const run = () => { if (active) void refreshRef.current(); };
    const initial = window.setTimeout(run, 0);
    const timer = window.setInterval(run, 60000);
    window.addEventListener('focus', run); window.addEventListener('online', run); document.addEventListener('visibilitychange', run);
    return () => { active = false; sequence.current++; window.clearTimeout(initial); window.clearInterval(timer); window.removeEventListener('focus', run); window.removeEventListener('online', run); document.removeEventListener('visibilitychange', run); };
  }, []);
  return { weather, loading, message, serviceError, preference, candidates, useDevice, refresh, search, choose, forget };
}
export type FamilyWeatherController = ReturnType<typeof useFamilyWeather>;
