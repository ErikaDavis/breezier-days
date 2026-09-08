export type WeatherArea = { latitude: number; longitude: number; name: string };
export type WeatherPreference = { mode: 'device' | 'manual'; area: WeatherArea | null };
export type ForecastDay = { date: string; high: number; low: number; code: number; rain: number | null; wind: number | null };
export type FamilyWeather = { temp: number; unit: 'fahrenheit'; code: number; description: string; locationName: string; receivedAt: number; days: ForecastDay[] };
export const weatherPreferenceKey = 'breezier-days.weather-area.v1';

export function coarseArea(latitude: number, longitude: number, name = 'Your approximate area'): WeatherArea {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw Error('Invalid area');
  // About 11 km in latitude: enough for a general forecast, not an address.
  return { latitude: Math.round(latitude * 10) / 10, longitude: Math.round(longitude * 10) / 10, name: name.slice(0, 160) };
}
export function readWeatherPreference(): WeatherPreference | null {
  try {
    const value = JSON.parse(localStorage.getItem(weatherPreferenceKey) || 'null');
    if (!value || !['device', 'manual'].includes(value.mode)) return null;
    return { mode: value.mode, area: value.area ? coarseArea(value.area.latitude, value.area.longitude, String(value.area.name || 'Saved area')) : null };
  } catch { return null; }
}
export function weatherDescription(code: number): string {
  if (code >= 95) return 'Thunderstorms';
  if ([56,57,66,67].includes(code)) return 'Freezing rain';
  if (code >= 71 && code <= 86 && ![80,81,82].includes(code)) return 'Snow';
  if ([65,82].includes(code)) return 'Heavy rain';
  if (code >= 51 && code <= 82) return 'Rain or drizzle';
  if (code === 45 || code === 48) return 'Fog';
  return ({0:'Clear',1:'Mostly clear',2:'Partly cloudy',3:'Cloudy'} as Record<number,string>)[code] || 'Conditions unavailable';
}
export async function weatherJson(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw Error('Weather unavailable');
    return await response.json();
  } finally { clearTimeout(timer); }
}
export async function getAreaWeather(area: WeatherArea): Promise<FamilyWeather> {
  const data = await weatherJson(`https://api.open-meteo.com/v1/forecast?latitude=${area.latitude}&longitude=${area.longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,wind_speed_10m_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=8`);
  const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
  if (!finite(data.current?.temperature_2m) || !finite(data.current?.weather_code) || !Array.isArray(data.daily?.time)) throw Error('Incomplete weather');
  const days: ForecastDay[] = data.daily.time.flatMap((date: string, i: number) => {
    const d = data.daily;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !finite(d.temperature_2m_max?.[i]) || !finite(d.temperature_2m_min?.[i]) || !finite(d.weather_code?.[i])) return [];
    return [{ date, high: Math.round(d.temperature_2m_max[i]), low: Math.round(d.temperature_2m_min[i]), code: d.weather_code[i], rain: finite(d.precipitation_probability_max?.[i]) ? d.precipitation_probability_max[i] : null, wind: finite(d.wind_speed_10m_max?.[i]) ? d.wind_speed_10m_max[i] : null }];
  });
  if (!days.length) throw Error('Forecast unavailable');
  return { temp: Math.round(data.current.temperature_2m), unit: 'fahrenheit', code: data.current.weather_code, description: weatherDescription(data.current.weather_code), locationName: area.name, receivedAt: Date.now(), days };
}
export function forecastFor(weather: FamilyWeather | null, offset = 0, now = new Date()): ForecastDay | null {
  if (!weather || now.getTime() - weather.receivedAt > 3600000 || now.getTime() < weather.receivedAt) return null;
  const date = new Date(now); date.setDate(date.getDate() + offset);
  const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  return weather.days.find(day => day.date === key) ?? null;
}
export function weatherGuidance(day: ForecastDay, baby = false) {
  const storm = day.code >= 95;
  const icy = [56,57,66,67].includes(day.code);
  const snow = [71,73,75,77,85,86].includes(day.code);
  const rain = [51,53,55,61,63,65,80,81,82].includes(day.code) || (day.rain ?? 0) >= 60;
  const hot = day.high >= 90;
  const cold = day.high <= 32 || day.low <= 20;
  const windy = (day.wind ?? 0) >= 25;
  const indoors = storm || icy || snow || rain || hot || cold || windy;
  let wear = cold || snow || icy ? 'Warm layers, a coat, hat and gloves; shoes with good grip.'
    : rain || storm ? (day.high < 65 ? 'Long sleeves and pants, a rain jacket and water-resistant shoes.' : 'Light clothes, a rain jacket and water-resistant shoes for necessary outings.')
    : hot ? 'Light, breathable clothes and a sun hat; plan shade and cooling breaks.'
    : day.high < 60 ? 'Long sleeves, pants and a jacket for outside.'
    : day.high < 75 ? 'A light top and pants; bring a removable layer.'
    : 'A T-shirt and shorts or other light clothes; bring a light layer.';
  if (windy && !cold && !rain && !storm) wear += ' Bring a wind-resistant layer.';
  if (baby) wear = cold || snow || icy
    ? 'For baby: warm, removable layers and a hat outdoors; adjust for comfort.'
    : 'For baby: light, removable layers, adjusted for comfort; keep a dry spare outfit handy.';
  const planning = storm ? 'Keep optional play indoors; check local alerts before outings.'
    : icy || snow ? 'Choose indoor play and check travel conditions before leaving.'
    : hot ? 'Keep optional play indoors during the heat; use cooler times for necessary outings.'
    : cold ? 'Keep optional play indoors and make outdoor transitions brief.'
    : windy ? 'Use indoor play if winds are strong; check conditions before outings.'
    : rain ? 'Keep an indoor option ready for rainy periods.'
    : 'A short outdoor break may fit; check conditions before heading out.';
  return { indoors, wear, planning, condition: `${weatherDescription(day.code)}${hot ? ' · Hot' : cold ? ' · Cold' : ''}${windy ? ' · Windy' : ''}` };
}

export function adaptPlanToWeather<T extends { phase: string; items: string[] }>(suggestions: T[], day: ForecastDay): T[] {
  const guidance = weatherGuidance(day);
  if (!guidance.indoors) return suggestions;
  // Keep scheduled commitments, rest and meal timing. Replace only optional
  // filler play suggestions that assume outdoor conditions are suitable.
  return suggestions.map(suggestion => ['morning','midmorning','afternoon'].includes(suggestion.phase)
    ? { ...suggestion, items: suggestion.items.map(item => /outside|outdoor|park|walk|backyard|playground|nature/i.test(item)
      && !/work|school|appointment|travel|routine|commitment/i.test(item)
      ? 'Choose a familiar indoor game, a book, or child-led play for this flexible time.' : item) }
    : suggestion);
}
