export interface CompanionEvent {
  id: string;
  title: string;
  startAt: string;
  durationMinutes: number;
  type: import('../types/studyflow').ScheduleBlockType;
  alarms?: import('../types/studyflow').CalendarAlarmSettings;
}

export interface CompanionCalendar {
  revision: number;
  events: CompanionEvent[];
  paired: boolean;
}

export function relayOrigin(address: string) {
  const url = new URL(address.trim());
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Enter the HTTPS address of your StudyFlow relay.');
  }
  return url.origin;
}

export async function relayRequest<T>(origin: string, path: string, method: string, token?: string, body?: unknown): Promise<T> {
  const response = await fetch(relayOrigin(origin) + path, {
    method,
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
    headers: {
      ...(token && { Authorization: 'Bearer ' + token }),
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Could not reach your StudyFlow calendar.');
  return data as T;
}
