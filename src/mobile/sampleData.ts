import type {
  AppUsageEntry,
  CompanionSubject,
  PendingPcEdit,
  ScheduleBlock,
} from './types';

export const COMPANION_TIMEZONE = 'Asia/Colombo';
export const COMPANION_UTC_OFFSET = 'GMT+5:30';

/** Exact StudyFlow PC subject colors from src/data/mockData.ts */
export const COMPANION_SUBJECTS: CompanionSubject[] = [
  { id: 'chem210', code: 'CHEM 210', name: 'Chemistry', color: '#D97706' },
  { id: 'math241', code: 'MATH 241', name: 'Multivariable Calculus', color: '#0D9488' },
  { id: 'cs340', code: 'CS 340', name: 'Algorithms & Complexity', color: '#4F46E5' },
  { id: 'neur302', code: 'NEUR 302', name: 'Systems Neuroscience', color: '#E11D48' },
];

/** Default demo start: Monday Nov 23, 7:15 AM (Asia/Colombo) */
export const DEMO_START_ABS_MIN = 7 * 60 + 15; // 435

export const INITIAL_SCHEDULE_BLOCKS: ScheduleBlock[] = [
  // Monday (dayIndex = 0)
  {
    id: 'blk-chem-mon',
    revision: 1,
    type: 'study',
    title: 'Organic Reaction Mechanisms',
    subjectId: 'chem210',
    dayIndex: 0,
    startMin: 7 * 60 + 30, // 7:30 AM
    durationMin: 90, // ends 9:00 AM
    advanceNoticeMin: 15, // heads-up at 7:15 AM
    ringAtStart: true, // start alarm at 7:30 AM
    focusIntervalMin: 25, // break prompt at 7:55 AM if started at 7:30 AM
    remindAtBedtime: false,
    wakeAtEnd: false,
    note: 'Chapter 14 carbonyl mechanisms & practice drills',
  },
  {
    id: 'blk-math-mon',
    revision: 1,
    type: 'study',
    title: "Stokes' Theorem Practice",
    subjectId: 'math241',
    dayIndex: 0,
    startMin: 10 * 60 + 30, // 10:30 AM
    durationMin: 90, // ends 12:00 PM
    advanceNoticeMin: 10,
    ringAtStart: true,
    focusIntervalMin: 25,
    remindAtBedtime: false,
    wakeAtEnd: false,
    note: 'Surface orientation integrals & curl problems',
  },
  {
    id: 'blk-free-lunch-mon',
    revision: 1,
    type: 'free',
    title: 'Lunch & Short Walk',
    dayIndex: 0,
    startMin: 12 * 60, // 12:00 PM
    durationMin: 75, // ends 1:15 PM
    advanceNoticeMin: 0,
    ringAtStart: false,
    remindAtBedtime: false,
    wakeAtEnd: false,
    note: 'Unplugged midday break',
  },
  {
    id: 'blk-cs-mon',
    revision: 1,
    type: 'study',
    title: 'NP-Completeness Reductions',
    subjectId: 'cs340',
    dayIndex: 0,
    startMin: 14 * 60 + 30, // 2:30 PM
    durationMin: 90, // ends 4:00 PM
    advanceNoticeMin: 15,
    ringAtStart: false,
    focusIntervalMin: 25,
    remindAtBedtime: false,
    wakeAtEnd: false,
    note: '3-SAT to Independent Set proof review',
  },
  {
    id: 'blk-free-eve-mon',
    revision: 1,
    type: 'free',
    title: 'Dinner & Wind-down',
    dayIndex: 0,
    startMin: 20 * 60, // 8:00 PM
    durationMin: 120, // ends 10:00 PM
    advanceNoticeMin: 0,
    ringAtStart: false,
    remindAtBedtime: false,
    wakeAtEnd: false,
    note: 'No study alerts',
  },
  {
    id: 'blk-sleep-mon',
    revision: 1,
    type: 'sleep',
    title: 'Overnight Sleep',
    dayIndex: 0,
    startMin: 23 * 60, // 11:00 PM Mon
    durationMin: 450, // 7h 30m -> ends 6:30 AM Tue (dayIndex = 1)
    advanceNoticeMin: 0, // Sleep never has an advance session alert
    ringAtStart: false,
    remindAtBedtime: true, // gentle bedtime notification at 11:00 PM
    wakeAtEnd: true, // single wake-up alarm at 6:30 AM Tue
    note: 'Target 7.5 hours rest before morning Chemistry review',
  },

  // Tuesday (dayIndex = 1)
  {
    id: 'blk-chem-tue',
    revision: 1,
    type: 'study',
    title: 'Spectroscopy IR & NMR Review',
    subjectId: 'chem210',
    dayIndex: 1,
    startMin: 8 * 60, // 8:00 AM
    durationMin: 90,
    advanceNoticeMin: 15,
    ringAtStart: true,
    focusIntervalMin: 25,
    remindAtBedtime: false,
    wakeAtEnd: false,
  },
  {
    id: 'blk-neur-tue',
    revision: 1,
    type: 'study',
    title: 'Synaptic Plasticity Notes',
    subjectId: 'neur302',
    dayIndex: 1,
    startMin: 11 * 60, // 11:00 AM
    durationMin: 60,
    advanceNoticeMin: 10,
    ringAtStart: false,
    focusIntervalMin: 25,
    remindAtBedtime: false,
    wakeAtEnd: false,
  },
  {
    id: 'blk-free-tue',
    revision: 1,
    type: 'free',
    title: 'Afternoon Break',
    dayIndex: 1,
    startMin: 13 * 60,
    durationMin: 60,
    advanceNoticeMin: 0,
    ringAtStart: false,
    remindAtBedtime: false,
    wakeAtEnd: false,
  },
  {
    id: 'blk-sleep-tue',
    revision: 1,
    type: 'sleep',
    title: 'Overnight Sleep',
    dayIndex: 1,
    startMin: 23 * 60, // 11:00 PM Tue
    durationMin: 450, // ends 6:30 AM Wed
    advanceNoticeMin: 0,
    ringAtStart: false,
    remindAtBedtime: true,
    wakeAtEnd: true,
  },

  // Wednesday (dayIndex = 2)
  {
    id: 'blk-cs-wed',
    revision: 1,
    type: 'study',
    title: 'Dynamic Programming Drills',
    subjectId: 'cs340',
    dayIndex: 2,
    startMin: 9 * 60,
    durationMin: 90,
    advanceNoticeMin: 15,
    ringAtStart: true,
    focusIntervalMin: 25,
    remindAtBedtime: false,
    wakeAtEnd: false,
  },
];

export const SESSION_SCREEN_TIME_APPS: AppUsageEntry[] = [
  { id: 'app-wa', name: 'WhatsApp', category: 'Messaging', minutes: 3, color: '#059669' },
  { id: 'app-yt', name: 'YouTube', category: 'Video', minutes: 2, color: '#E11D48' },
  { id: 'app-chrome', name: 'Chrome', category: 'Browser', minutes: 1, color: '#2563EB' },
];

export const TODAY_SCREEN_TIME_APPS: AppUsageEntry[] = [
  { id: 'app-wa', name: 'WhatsApp', category: 'Messaging', minutes: 14, color: '#059669' },
  { id: 'app-yt', name: 'YouTube', category: 'Video', minutes: 12, color: '#E11D48' },
  { id: 'app-ig', name: 'Instagram', category: 'Social', minutes: 9, color: '#D97706' },
  { id: 'app-chrome', name: 'Chrome', category: 'Browser', minutes: 7, color: '#2563EB' },
];

export const SIMULATED_PC_CALENDAR_EDIT: PendingPcEdit = {
  id: 'pc-edit-math-1',
  summary: "PC moved Stokes' Theorem Practice to 11:00 AM – 12:30 PM",
  blockId: 'blk-math-mon',
  newTitle: "Stokes' Theorem & Curl Lab (PC edit)",
  newStartMin: 11 * 60, // 11:00 AM
  newDurationMin: 90,
};
