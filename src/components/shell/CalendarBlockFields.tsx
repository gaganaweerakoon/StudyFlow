import { useState } from 'react';
import type { ScheduleBlockType, StudySession } from '../../types/studyflow';

type BlockFields = Pick<StudySession, 'blockType' | 'countsTowardStudy' | 'alarms'>;

export function readCalendarBlockFields(data: FormData): BlockFields {
  const selected = data.get('blockType');
  const blockType = selected === 'sleep' || selected === 'free' ? selected : 'study';
  const advance = Number(data.get('advanceNotice'));
  return {
    blockType,
    countsTowardStudy: blockType === 'study',
    alarms: {
      advanceNoticeMin: blockType === 'study' && (advance === 10 || advance === 15) ? advance : 0,
      ringAtStart: blockType === 'study' && data.has('ringAtStart'),
      remindAtBedtime: blockType === 'sleep' && data.has('remindAtBedtime'),
      wakeAtEnd: blockType === 'sleep' && data.has('wakeAtEnd'),
    },
  };
}

export function CalendarBlockFields({ session, subjects }: {
  session?: StudySession;
  subjects: { id: string; name: string }[];
}) {
  const [type, setType] = useState<ScheduleBlockType>(
    session?.blockType ?? (session?.countsTowardStudy === false ? 'free' : 'study'),
  );

  return (
    <fieldset className="grid gap-2 text-xs text-[var(--text-secondary)]">
      <label className="flex flex-wrap items-center gap-2">
        Block type
        <select name="blockType" value={type} onChange={event => setType(event.target.value as ScheduleBlockType)}>
          <option value="study">Study</option>
          <option value="sleep">Sleep</option>
          <option value="free">Free time</option>
        </select>
      </label>
      {type === 'study' && (
        <>
          <label className="flex flex-wrap items-center gap-2">
            Subject
            <select name="subject" defaultValue={session?.subjectId ?? ''}>
              <option value="">Unassigned</option>
              {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </label>
          <label className="flex flex-wrap items-center gap-2">
            Advance reminder
            <select name="advanceNotice" defaultValue={session?.alarms?.advanceNoticeMin ?? 0}>
              <option value="0">Off</option>
              <option value="10">10 minutes before</option>
              <option value="15">15 minutes before</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="ringAtStart" defaultChecked={session?.alarms?.ringAtStart} />
            Ring at session start
          </label>
        </>
      )}
      {type === 'sleep' && (
        <>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="remindAtBedtime" defaultChecked={session?.alarms?.remindAtBedtime} />
            Remind me at bedtime
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="wakeAtEnd" defaultChecked={session?.alarms?.wakeAtEnd} />
            Wake me at the end
          </label>
        </>
      )}
    </fieldset>
  );
}


export function RepeatWeekdays({ selected = [] }: { selected?: number[] }) {
  return (
    <fieldset className="flex flex-wrap gap-3 text-xs">
      <legend className="mb-2">Repeat each week on</legend>
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
        <label className="flex items-center gap-1" key={day}>
          <input type="checkbox" name="repeat-day" value={index} defaultChecked={selected.includes(index)} /> {day}
        </label>
      ))}
    </fieldset>
  );
}
