import { useState } from 'react';
import { formatHourLabel } from '../../utils/studyLogic';

const dayMinutes = 24 * 60;
const toMinute = (hour: number) => (Math.round(hour * 60) + dayMinutes) % dayMinutes;
const choices = Array.from({ length: 96 }, (_, index) => index * 15);

function duration(start: number, end: number) {
  return (end - start + dayMinutes) % dayMinutes || dayMinutes;
}

export function readSessionTimeFields(data: FormData) {
  const start = Number(data.get('start-minute'));
  const end = Number(data.get('end-minute'));
  return { startHour: start / 60, durationHours: duration(start, end) / 60 };
}

export function SessionTimeFields({ startHour = 15, durationHours = 1.5 }: { startHour?: number; durationHours?: number }) {
  const [start, setStart] = useState(() => toMinute(startHour));
  const [end, setEnd] = useState(() => toMinute(startHour + durationHours));
  const items = [...new Set([...choices, toMinute(startHour), toMinute(startHour + durationHours), start, end])].sort((a, b) => a - b);
  const minutes = duration(start, end);
  const elapsed = [Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)} h` : '', minutes % 60 ? `${minutes % 60} min` : ''].filter(Boolean).join(' ');

  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="grid gap-1">Start time
        <select name="start-minute" className="min-w-0 rounded-lg border border-[var(--border-subtle)] p-2"
          value={start} onChange={event => {
            const next = Number(event.target.value);
            setStart(next);
            setEnd((next + minutes) % dayMinutes);
          }}>
          {items.map(value => <option key={value} value={value}>{formatHourLabel(value / 60)}</option>)}
        </select>
      </label>
      <label className="grid gap-1">End time
        <select name="end-minute" className="min-w-0 rounded-lg border border-[var(--border-subtle)] p-2"
          value={end} onChange={event => setEnd(Number(event.target.value))}>
          {items.map(value => <option key={value} value={value}>{formatHourLabel(value / 60)}</option>)}
        </select>
      </label>
      <p className="col-span-2 text-[var(--text-secondary)]">{elapsed}{end <= start ? ' · Ends next day' : ''}</p>
    </div>
  );
}
