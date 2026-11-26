import assert from 'node:assert/strict';
import test from 'node:test';
import {chooseCheckIn} from './checkIns';
const base: Parameters<typeof chooseCheckIn>[0] = {
  settings:{enabled:true},date:'2026-11-26',time:'19:00',now:100,running:false,notifications:[],goals:[],tasks:[],
  sessions:[{id:'lesson',title:'Chemistry',subjectId:'chem',dayIndex:3,date:'2026-11-26',startHour:17,durationHours:1,status:'upcoming'}],
  focusHistory:[],newMilestones:new Set(),
};
test('recovery requires a recent ended unlogged study block', () => {
  assert.equal(chooseCheckIn(base)?.key, 'session/lesson');
  assert.equal(chooseCheckIn({...base, focusHistory:[{id:'log',calendarSessionId:'lesson',durationMinutes:12,subjectId:'chem',taskTitle:'Chemistry',completedAt:base.date,mode:'Custom',qualityRating:4}]}),undefined);
});
test('quiet hours, active focus, snooze, opt-out, trigger settings and delivery receipts suppress notifications', () => {
  for (const patch of [{time:'23:00'}, {running:true}, {settings:{}}, {settings:{enabled:true,snoozeUntil:101}},
    {settings:{enabled:true,recovery:false}}, {notifications:[{id:'pip/2026-11-26/task/other'}]},
    {notifications:[{id:'pip/2026-11-25/session/lesson'}]}]) assert.equal(chooseCheckIn({...base,...patch}),undefined);
});
test('an evening with no next step stays quiet', () => assert.equal(chooseCheckIn({...base,sessions:[]}),undefined));
