import React, { useId, useState } from 'react';
import { forecastFor, weatherGuidance } from './familyWeather';
import { startFeature } from './analytics';
import type { FamilyWeatherController } from './useFamilyWeather';

export default function FamilyWeatherPanel({ controller: c, offset = 0, baby = false }: { controller: FamilyWeatherController; offset?: number; baby?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const inputId = useId();
  const day = forecastFor(c.weather, offset);
  const guidance = day ? weatherGuidance(day, baby) : null;
  return <div className="family-weather" aria-busy={c.loading}>
    {day && guidance ? <>
      <div className="family-weather-grid">
        <div><h3>{offset === 0 ? 'Today’s weather' : 'Weather for this day'}</h3><p>{offset === 0 ? `${c.weather!.temp}°F now · ` : ''}High {day.high}° / low {day.low}°F<br />{guidance.condition}{day.rain !== null && day.rain >= 30 ? ` · ${day.rain}% rain chance` : ''}</p></div>
        <div><h3>What to wear</h3><p>{guidance.wear}</p></div>
      </div>
      <div className="family-weather-meta"><span>{c.weather!.locationName} · updated {new Date(c.weather!.receivedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span><button type="button" onClick={() => setEditing(!editing)}>Change area</button><button type="button" disabled={c.loading} onClick={() => void c.refresh(true)}>Refresh weather</button></div>
    </> : <div className="family-weather-setup"><strong>{offset === 0 ? 'Today’s weather + what to wear' : 'Weather for your plan'}</strong><span>{c.preference?.area ? (c.loading ? 'Checking your saved area.' : 'Forecast unavailable for this day.') : 'Add local weather when it helps.'}</span><div><button type="button" disabled={c.loading} onClick={() => { startFeature('weather', 'open'); c.useDevice(); }}>Use my location</button><button type="button" onClick={() => setEditing(!editing)}>Choose a city</button></div></div>}
    {c.loading && <p role="status" className="family-weather-message">Checking weather…</p>}
    {c.message && <p role="status" className="family-weather-message">{c.message}</p>}
    {editing && <div className="family-weather-editor">
      <label htmlFor={inputId}>City or ZIP/postal code</label>
      <form onSubmit={event => { event.preventDefault(); startFeature('weather', 'open'); void c.search(query); }}><input id={inputId} value={query} onChange={event => setQuery(event.target.value)} placeholder="City, region or postal code" autoComplete="off" /><button type="submit" disabled={c.loading || !query.trim()}>Find area</button></form>
      {c.candidates.length > 0 && <div className="family-weather-places" aria-label="Choose your weather area">{c.candidates.map((area, i) => <button type="button" key={`${area.name}-${i}`} onClick={() => { c.choose(area); setEditing(false); setQuery(''); }}>{area.name}</button>)}</div>}
      <p className="family-weather-privacy">Only an approximate area is remembered on this device. Weather uses Open-Meteo; location is never sent to analytics.</p>
      <div className="family-weather-meta"><button type="button" disabled={c.loading} onClick={() => { startFeature('weather', 'open'); c.useDevice(); }}>Use my location instead</button>{c.preference?.area && <button type="button" onClick={() => { c.forget(); setEditing(false); }}>Forget weather area</button>}<button type="button" onClick={() => setEditing(false)}>Done</button></div>
    </div>}
    {day && <a className="family-weather-source" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather: Open-Meteo</a>}
  </div>;
}
