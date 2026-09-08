import React, { useEffect, useState } from 'react';
import { dailyContent, type DailyStage } from './dailyContent';

type Props = {
  stage: DailyStage;
  traits?: readonly string[];
  weather: { description: string; receivedAt?: number } | null;
  onHelp: () => void;
};

export default function TodayInBreezierDays({ stage, traits = [], weather, onHelp }: Props) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  const { activity, tip } = dailyContent(now, stage, traits);
  const recentWeather = weather?.receivedAt && now.getTime() >= weather.receivedAt && now.getTime() - weather.receivedAt < 3600000;
  const note = recentWeather ? `${weather.description} at your last weather check. Here’s something easy to do indoors.`
    : now.getDay() === 0 || now.getDay() === 6 ? 'A weekend moment to connect, at your own pace.' : 'A little connection can fit into an ordinary day.';
  return (
    <section className="daily-brief" aria-labelledby="daily-brief-title">
      <h2 id="daily-brief-title">Today in Breezier Days</h2>
      <p className="daily-brief-today"><strong>Today:</strong> <time dateTime={`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`}>{now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</time> · {note}</p>
      <div className="daily-brief-grid">
        <div><h3>One easy activity</h3><p>{activity}</p></div>
        <div><h3>Today’s tip</h3><p>{tip}</p></div>
      </div>
      <div className="daily-brief-help"><span>Need help right now?</span><button type="button" data-analytics-view="practical_help" onClick={onHelp}>What Do I Do Right Now? →</button></div>
    </section>
  );
}
