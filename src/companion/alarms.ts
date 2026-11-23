import type { CompanionEvent } from './client';

export interface DeviceAlert {
  id: string;
  title: string;
  time: number;
  exact: boolean;
}

export function deviceAlerts(events: CompanionEvent[], now: number): DeviceAlert[] {
  const alerts: DeviceAlert[] = [];
  const horizon = now + 30 * 86400000;
  for (const event of events) {
    const { alarms } = event;
    if (!alarms || event.type === 'free') continue;
    const start = Date.parse(event.startAt);
    const add = (kind: string, title: string, time: number, exact: boolean) => {
      if (time > now && time <= horizon) alerts.push({ id: kind + ':' + event.id, title: title.slice(0, 300), time, exact });
    };
    if (event.type === 'sleep') {
      if (alarms.remindAtBedtime) add('bedtime', 'Time for bed', start, false);
      if (alarms.wakeAtEnd) add('wake', 'Time to wake up', start + event.durationMinutes * 60000, true);
    } else {
      if (alarms.advanceNoticeMin === 10 || alarms.advanceNoticeMin === 15) {
        add('heads-up', `${event.title} starts in ${alarms.advanceNoticeMin} minutes`, start - alarms.advanceNoticeMin * 60000, false);
      }
      if (alarms.ringAtStart) add('start', event.title + ' starts now', start, true);
    }
  }
  return alerts.sort((a, b) => a.time - b.time);
}
