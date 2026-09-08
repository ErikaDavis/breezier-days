import { localDay } from './dailyContent';
import type { ForecastDay } from './familyWeather';

// Editorial suggestions only: no requests, storage, analytics or paid services.
export function goodForToday(date: Date, forecast: ForecastDay | null = null, latitude?: number | null): string {
  const day = localDay(date);
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  let choices: string[];
  if (forecast && (forecast.code >= 95 || [56,57,66,67,71,73,75,77,85,86].includes(forecast.code) || forecast.high >= 90 || forecast.low <= 20 || forecast.high <= 32 || (forecast.wind ?? 0) >= 25)) {
    choices = [
      'An indoor kind of day — curl up with a favorite story after dinner.',
      'Staying close to home? Let your child pick a song and have a little dance together.',
      'Before bedtime, get cozy and share one funny thing from your day.',
      'Try an indoor treasure hunt after pickup or work: find something soft, round, or blue.',
    ];
  } else if (forecast && ([51,53,55,61,63,65,80,81,82].includes(forecast.code) || (forecast.rain ?? 0) >= 40)) {
    choices = [
      'Rain is possible — tuck a favorite book aside for a cozy read when everyone’s home.',
      'A rainy-day backup: share a favorite book when everyone is home.',
      'Rain might change your plans — try a kitchen dance party after dinner.',
      'Rain in the forecast — settle by a window after pickup or work and see what you can spot.',
    ];
  } else if (forecast && forecast.high >= 78) {
    choices = [
      'It’s a warm one — try a shaded playground, quick walk, or a little outside time when it fits.',
      'Warm today — bring some water and share a snack in the shade when you have a moment.',
      'After pickup or work, try a short shady walk if it’s cooled down enough to feel comfortable.',
      'A splash pad could be fun on a warm day — check opening hours for a time that suits your family.',
    ];
  } else if (forecast) {
    choices = weekend ? [
      'If it feels nice out, visit a nearby park and let your child set the pace.',
      'Take a little neighborhood wander when it fits — see how many birds you can spot.',
      'Try a familiar outdoor spot and let your child choose what to notice.',
      'Step outside together and look for shapes in the clouds — a few minutes is plenty.',
    ] : [
      'A short walk after pickup or work could be today’s outside time, if conditions feel comfortable.',
      'If there’s a spare moment before school or daycare, pause outside and notice one thing together.',
      'Try a few minutes outside after dinner if weather and daylight allow; keep it close to home.',
      'When you reconnect, step outside together and listen for birds if the weather feels comfortable.',
    ];
  } else {
    choices = weekend ? [
      'Look for three things of the same color together — around the house or outside, weather permitting.',
      'Visit a favorite nearby spot when it fits, and let your child choose what to look at first.',
      'Let your child help choose one small thing to enjoy together this weekend.',
      'Busy weekend? Take a few minutes to sit together and share a favorite book.',
    ] : [
      'After pickup or work, let your child pick a song to listen to together.',
      'Share one small highlight from the day over dinner or before bedtime.',
      'Try singing a favorite song together while getting ready for school or daycare.',
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
      summer: ['If it’s warm enough for splashing, check a nearby splash pad’s hours for a time that works for you.', 'Take your usual snack outside for a little picnic in the shade when it fits.'],
      autumn: ['Look for changing leaves on the way home, if autumn colors have reached your area.', 'If a nearby pumpkin patch is in season, check its hours for a time that fits your family.'],
      winter: ['Look for seasonal lights on your usual route home — let your child pick a favorite.', 'Get cozy after dinner and let your child choose a story to share.'],
    };
    return seasonal[season][Math.floor(day / 5) % 2];
  }
  return choices[((day % choices.length) + choices.length) % choices.length];
}
