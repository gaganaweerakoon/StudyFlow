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

const selectClass =
  'w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-2.5 py-1.5 text-[12.5px] text-[var(--text-primary)]';

export function CalendarBlockFields({ session, subjects }: {
  session?: StudySession;
  subjects: { id: string; name: string }[];
}) {
  const [type, setType] = useState<ScheduleBlockType>(
    session?.blockType ?? (session?.countsTowardStudy === false ? 'free' : 'study'),
  );

  return (
    <fieldset className="grid gap-3 text-[12px] text-[var(--text-secondary)]">
      <div className={type === 'study' ? 'grid grid-cols-2 gap-2.5' : 'grid gap-1'}>
        <label className="grid gap-1">
          <span className="font-medium text-[var(--text-secondary)]">Block type</span>
          <select
            name="blockType"
            value={type}
            onChange={event => setType(event.target.value as ScheduleBlockType)}
            className={selectClass}
          >
            <option value="study">Study</option>
            <option value="sleep">Sleep</option>
            <option value="free">Free time</option>
          </select>
        </label>
        {type === 'study' && (
          <label className="grid gap-1">
            <span className="font-medium text-[var(--text-secondary)]">Subject</span>
            <select name="subject" defaultValue={session?.subjectId ?? ''} className={selectClass}>
              <option value="">Unassigned</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {type === 'study' && (
        <div className="grid gap-2.5 pt-1 border-t border-[var(--border-subtle)]">
          <label className="grid gap-1">
            <span className="font-medium text-[var(--text-secondary)]">Advance reminder</span>
            <select
              name="advanceNotice"
              defaultValue={session?.alarms?.advanceNoticeMin ?? 0}
              className={selectClass}
            >
              <option value="0">Off</option>
              <option value="10">10 minutes before</option>
              <option value="15">15 minutes before</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-[12.5px] text-[var(--text-primary)] cursor-pointer select-none">
            <input
              type="checkbox"
              name="ringAtStart"
              defaultChecked={session?.alarms?.ringAtStart}
              className="rounded accent-[var(--accent)]"
            />
            Ring at session start
          </label>
        </div>
      )}

      {type === 'sleep' && (
        <div className="grid gap-2 pt-1 border-t border-[var(--border-subtle)]">
          <label className="flex items-center gap-2 text-[12.5px] text-[var(--text-primary)] cursor-pointer select-none">
            <input
              type="checkbox"
              name="remindAtBedtime"
              defaultChecked={session?.alarms?.remindAtBedtime}
              className="rounded accent-[var(--accent)]"
            />
            Remind me at bedtime
          </label>
          <label className="flex items-center gap-2 text-[12.5px] text-[var(--text-primary)] cursor-pointer select-none">
            <input
              type="checkbox"
              name="wakeAtEnd"
              defaultChecked={session?.alarms?.wakeAtEnd}
              className="rounded accent-[var(--accent)]"
            />
            Wake me at the end
          </label>
        </div>
      )}
    </fieldset>
  );
}

export function RepeatWeekdays({ selected = [] }: { selected?: number[] }) {
  return (
    <fieldset className="space-y-1.5 text-[12px]">
      <legend className="font-medium text-[var(--text-secondary)]">Repeat each week on</legend>
      <div className="grid grid-cols-7 gap-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
          <label
            key={day}
            className="flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[11px] font-medium text-[var(--text-primary)] cursor-pointer select-none hover:bg-[var(--bg-surface-hover)] transition-colors"
          >
            <input
              type="checkbox"
              name="repeat-day"
              value={index}
              defaultChecked={selected.includes(index)}
              className="accent-[var(--accent)]"
            />
            <span>{day}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
