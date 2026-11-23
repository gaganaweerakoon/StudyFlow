import React, { useEffect, useRef } from 'react';
import { Bell, Coffee, Moon } from 'lucide-react';
import { useCompanion } from '../CompanionContext';
import {
  WEEK_DAYS,
  calculateDailyStudyMinutes,
  formatDurationLabel,
  formatMinutes12h,
  fromAbsMin,
  getTimelineSegmentsForDay,
} from '../companionLogic';
import { COMPANION_UTC_OFFSET } from '../sampleData';

const HOUR_HEIGHT = 54;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatAxisHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export const CalendarView: React.FC = () => {
  const {
    nowAbsMin,
    selectedDayIndex,
    setSelectedDayIndex,
    blocks,
    subjects,
    selectedBlockId,
    openEventSheet,
  } = useCompanion();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { dayIndex: todayIndex, minuteOfDay: nowMinute } = fromAbsMin(nowAbsMin);
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const segments = getTimelineSegmentsForDay(blocks, selectedDayIndex);
  const studyTotalMin = calculateDailyStudyMinutes(blocks, selectedDayIndex);
  const selectedDay = WEEK_DAYS[selectedDayIndex] ?? WEEK_DAYS[0];

  // Auto-scroll timeline to roughly 1 hour before current time on mount or day switch
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const focusMin = selectedDayIndex === todayIndex ? Math.max(0, nowMinute - 90) : 6 * 60;
    el.scrollTop = (focusMin / 60) * HOUR_HEIGHT;
  }, [selectedDayIndex, todayIndex]);

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar + Week Strip */}
      <div
        className="px-4 pt-3 pb-2.5 space-y-2.5 shrink-0"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="font-display text-[calc(18px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)] leading-tight truncate">
              {selectedDay.full}, {selectedDay.monthShort} {selectedDay.num}
            </h1>
            <p className="text-[calc(12px*var(--sf-font-scale,1))] text-[var(--text-muted)] font-mono-num mt-0.5">
              {formatDurationLabel(studyTotalMin)} study scheduled · {COMPANION_UTC_OFFSET}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedDayIndex(todayIndex)}
            className="min-h-[48px] px-3.5 rounded-xl text-[calc(12.5px*var(--sf-font-scale,1))] font-semibold shrink-0 transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor:
                selectedDayIndex === todayIndex ? 'var(--accent-soft)' : 'var(--bg-surface-subtle)',
              border:
                selectedDayIndex === todayIndex
                  ? '1px solid var(--accent-border)'
                  : '1px solid var(--border-subtle)',
              color: selectedDayIndex === todayIndex ? 'var(--accent)' : 'var(--text-primary)',
            }}
          >
            Today
          </button>
        </div>

        {/* 7-day Week Strip */}
        <div className="grid grid-cols-7 gap-1" role="tablist" aria-label="Week days">
          {WEEK_DAYS.map((day) => {
            const isSelected = day.dayIndex === selectedDayIndex;
            const isToday = day.dayIndex === todayIndex;
            const dayStudyMin = calculateDailyStudyMinutes(blocks, day.dayIndex);
            return (
              <button
                key={day.dateIso}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedDayIndex(day.dayIndex)}
                className="min-h-[52px] rounded-lg flex flex-col items-center justify-center py-1 transition-colors"
                style={{
                  backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                  color: isSelected ? 'var(--accent-fg)' : 'var(--text-primary)',
                  border:
                    !isSelected && isToday
                      ? '1px solid var(--accent-border)'
                      : '1px solid transparent',
                }}
              >
                <span
                  className="text-[calc(10.5px*var(--sf-font-scale,1))] font-medium"
                  style={{
                    color: isSelected ? 'var(--accent-fg)' : 'var(--text-muted)',
                    opacity: isSelected ? 0.9 : 1,
                  }}
                >
                  {day.short}
                </span>
                <span className="font-mono-num text-[calc(13px*var(--sf-font-scale,1))] font-semibold leading-tight mt-0.5">
                  {day.num}
                </span>
                <span
                  className="text-[calc(9.5px*var(--sf-font-scale,1))] font-mono-num leading-none mt-0.5"
                  style={{
                    color: isSelected ? 'var(--accent-fg)' : 'var(--text-muted)',
                    opacity: isSelected ? 0.85 : 0.85,
                  }}
                >
                  {dayStudyMin > 0 ? `${(dayStudyMin / 60).toFixed(1)}h` : '—'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Compact Legend using exact PC visual language */}
        <div className="flex items-center gap-3 text-[calc(11px*var(--sf-font-scale,1))] text-[var(--text-muted)] pt-0.5">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: '#D9770618', border: '1px solid #D9770655' }}
            />
            Study
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-strong)',
              }}
            />
            Sleep
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{
                backgroundColor: 'var(--bg-canvas)',
                border: '1px solid var(--border-subtle)',
              }}
            />
            Free time
          </span>
        </div>
      </div>

      {/* Vertically Scrolling 24-Hour Day Timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 py-2">
        <div
          className="relative"
          style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}
        >
          {/* Hour grid lines */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute inset-x-0 flex items-start"
              style={{
                top: `${hour * HOUR_HEIGHT}px`,
                height: `${HOUR_HEIGHT}px`,
              }}
            >
              <div className="w-[52px] pr-2 text-right font-mono-num text-[calc(10.5px*var(--sf-font-scale,1))] text-[var(--text-muted)] -mt-1.5 shrink-0 select-none">
                {formatAxisHour(hour)}
              </div>
              <div
                className="flex-1 h-full"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              />
            </div>
          ))}

          {/* Scheduled Blocks Layer */}
          <div className="absolute top-0 bottom-0 left-[54px] right-1">
            {segments.map((seg) => {
              const { block, segmentStartMin, segmentEndMin } = seg;
              const topPx = (segmentStartMin / 60) * HOUR_HEIGHT;
              const heightPx = Math.max(48, ((segmentEndMin - segmentStartMin) / 60) * HOUR_HEIGHT - 3);
              const sub = block.subjectId ? subjectMap.get(block.subjectId) : undefined;
              const isSelected = selectedBlockId === block.id;

              // Exact StudyFlow PC styling for each block type (zero invented off-token tints or dashed borders)
              let blockStyle: React.CSSProperties;
              if (block.type === 'study') {
                const color = sub?.color ?? '#4F46E5';
                blockStyle = {
                  top: topPx,
                  height: heightPx,
                  backgroundColor: `${color}18`,
                  border: isSelected ? `1.5px solid ${color}` : `1px solid ${color}45`,
                };
              } else if (block.type === 'sleep') {
                blockStyle = {
                  top: topPx,
                  height: heightPx,
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: isSelected
                    ? '1.5px solid var(--accent)'
                    : '1px solid var(--border-strong)',
                };
              } else {
                blockStyle = {
                  top: topPx,
                  height: heightPx,
                  backgroundColor: 'var(--bg-canvas)',
                  border: isSelected
                    ? '1.5px solid var(--accent)'
                    : '1px solid var(--border-subtle)',
                };
              }

              const startLabel = formatMinutes12h(segmentStartMin);
              const endLabel =
                segmentEndMin === 1440 ? '12:00 AM' : formatMinutes12h(segmentEndMin);

              return (
                <button
                  key={`${block.id}-${seg.dayIndex}-${segmentStartMin}`}
                  type="button"
                  onClick={() => openEventSheet(block.id)}
                  aria-label={`${block.title}, ${block.type}, ${startLabel} to ${endLabel}`}
                  className="absolute inset-x-0 rounded-lg px-2.5 py-1.5 text-left overflow-hidden transition-shadow focus-visible:outline-2"
                  style={blockStyle}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {block.type === 'study' && (
                        <span
                          className="text-[calc(11px*var(--sf-font-scale,1))] font-semibold truncate"
                          style={{ color: sub?.color ?? 'var(--accent)' }}
                        >
                          {sub?.code ?? 'STUDY'}
                        </span>
                      )}
                      {block.type === 'sleep' && (
                        <span className="inline-flex items-center gap-1 text-[calc(11px*var(--sf-font-scale,1))] font-semibold text-[var(--text-secondary)]">
                          <Moon className="w-3 h-3" />
                          Sleep
                          {seg.isCrossMidnightStart ? ' · continues tomorrow' : ''}
                          {seg.isCrossMidnightEnd ? ' · from last night' : ''}
                        </span>
                      )}
                      {block.type === 'free' && (
                        <span className="inline-flex items-center gap-1 text-[calc(11px*var(--sf-font-scale,1))] font-medium text-[var(--text-muted)]">
                          <Coffee className="w-3 h-3" />
                          Free time
                        </span>
                      )}
                    </div>

                    {block.type === 'study' && (block.advanceNoticeMin > 0 || block.ringAtStart) && (
                      <Bell className="w-3 h-3 shrink-0 text-[var(--text-muted)]" />
                    )}
                  </div>

                  <div className="text-[calc(12.5px*var(--sf-font-scale,1))] font-semibold text-[var(--text-primary)] leading-tight truncate mt-0.5">
                    {block.title}
                  </div>

                  {heightPx >= 54 && (
                    <div className="font-mono-num text-[calc(11px*var(--sf-font-scale,1))] text-[var(--text-muted)] mt-0.5 truncate">
                      {startLabel} – {endLabel}
                      {block.type === 'sleep' && seg.isCrossMidnightEnd && block.wakeAtEnd
                        ? ` · Wake alarm ${endLabel}`
                        : ''}
                    </div>
                  )}
                </button>
              );
            })}

            {/* Current-Time Indicator Line (exact PC Planner rose line + leading dot) */}
            {selectedDayIndex === todayIndex && (
              <div
                aria-label={`Current time ${formatMinutes12h(nowMinute)}`}
                className="absolute inset-x-0 pointer-events-none flex items-center z-10"
                style={{ top: `${(nowMinute / 60) * HOUR_HEIGHT}px` }}
              >
                <span className="w-2.5 h-2.5 rounded-full -ml-1.5 bg-rose-500 shrink-0" />
                <div className="flex-1 h-[1.5px] bg-rose-500" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
