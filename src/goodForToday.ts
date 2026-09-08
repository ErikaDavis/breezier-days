import { localDay } from './dailyContent';
import type { ForecastDay } from './familyWeather';

// Editorial suggestions only: no requests, storage, analytics or paid services.
export function goodForToday(date: Date, forecast: ForecastDay | null = null, latitude?: number | null): string {
  const day = localDay(date);
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  let choices: string[];
  if (forecast && (forecast.code >= 95 || [56,57,66,67,71,73,75,77,85,86].includes(forecast.code) || forecast.high >= 90 || forecast.low <= 20 || forecast.high <= 32 || (forecast.wind ?? 0) >= 25)) {
    choices = [
      'An indoor kind of day — a cozy story after dinner could be your shared moment.',
      'Keep plans close to home — let your child choose a song to enjoy together when you reconnect.',
      'Make room for a quiet catch-up before bedtime; no outing needed today.',
      'A little indoor play after pickup or work can be enough for today.',
    ];
  } else if (forecast && ([51,53,55,61,63,65,80,81,82].includes(forecast.code) || (forecast.rain ?? 0) >= 40)) {
    choices = [
      'Rain is possible — keep a library visit or cozy time at home as your flexible option.',
      'A rainy-day backup: share a favorite book when everyone is home.',
      'Leave outdoor plans flexible; a few minutes of music together can fit after dinner.',
      'Rain in the forecast — a window-side catch-up could be your pause after pickup or work.',
    ];
  } else if (forecast && forecast.high >= 78) {
    choices = [
      'A warm day — a short shaded stop could fit when your family has a little time.',
      'Keep it simple on a warm day: sit in the shade together if it feels comfortable outside.',
      'A shaded outdoor pause after pickup or work could be enough; check the heat before heading out.',
      'Warm-weather option: check whether a nearby splash pad fits your free time and is open.',
    ];
  } else if (forecast) {
    choices = weekend ? [
      'If conditions feel comfortable, leave a little room for an unhurried park visit.',
      'A short neighborhood wander could be today’s shared adventure, whenever it fits.',
      'Try a familiar outdoor spot and let your child choose what to notice.',
      'A little fresh air can be enough — no need to turn it into a full outing.',
    ] : [
      'A short walk after pickup or work could be today’s outside time, if conditions feel comfortable.',
      'If there’s a spare moment before school or daycare, pause outside and notice one thing together.',
      'Try a few minutes outside after dinner if weather and daylight allow; keep it close to home.',
      'An outdoor pause when you reconnect may fit better than planning a whole outing.',
    ];
  } else {
    choices = weekend ? [
      'Leave room for one easy family moment today; choose indoors or out to suit the weather.',
      'A familiar nearby spot could make a simple outing, whenever your family has time.',
      'Let your child help choose one small thing to enjoy together this weekend.',
      'A slow moment together counts, even if today is a busy weekend day.',
    ] : [
      'A few minutes to reconnect after pickup or work can be today’s good thing.',
      'Share one small highlight from the day over dinner or before bedtime.',
      'Before school or daycare, a favorite song can make a little room for connection.',
      'Leave a little space before bedtime for your child to tell or show you something.',
    ];
  }
  // Without a known hemisphere, do not assume the local season. Tropical areas
  // also keep the weather/date fallback rather than temperate seasonal claims.
  const temperate = typeof latitude === 'number' && Math.abs(latitude) >= 23.5;
  const safeSeason = !forecast || !(forecast.code >= 51 || forecast.high >= 90 || forecast.high <= 32 || forecast.low <= 20 || (forecast.wind ?? 0) >= 25 || (forecast.rain ?? 0) >= 40);
  if (temperate && safeSeason && day % 5 === 0) {
    const month = (date.getMonth() + (latitude! < 0 ? 6 : 0)) % 12;
    const season = month >= 2 && month <= 4 ? 'spring' : month >= 5 && month <= 7 ? 'summer' : month >= 8 && month <= 10 ? 'autumn' : 'winter';
    const seasonal = {
      spring: ['Notice any new leaves or blossoms on a familiar route when you have a moment.', 'At your next grocery stop, see which local fruit is in season and choose one together.'],
      summer: ['If a splash pad nearby is open, it could be a flexible warm-weather option when you have time.', 'A shaded picnic snack could turn an ordinary free moment into something special.'],
      autumn: ['Look for changing leaves on the way home, if autumn colors have reached your area.', 'If a nearby pumpkin patch is in season, check its hours for a time that fits your family.'],
      winter: ['Notice any seasonal lights on your usual route home; a special outing is optional.', 'A cozy story after dinner can be your small seasonal ritual today.'],
    };
    return seasonal[season][Math.floor(day / 5) % 2];
  }
  return choices[((day % choices.length) + choices.length) % choices.length];
}
