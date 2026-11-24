import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveOfflineFocus, validOfflineRecord, type OfflineFocusRecord } from './offlineFocus';
import type { FocusTimerState } from '../context/AppContext';
import type { FocusHistoryItem } from '../types/studyflow';

const record: OfflineFocusRecord = { id: 'phone-12345678-1234-1234-1234-123456789012', subjectId: 'chem', subjectName: 'Chemistry', title: 'Chemistry', startedAt: 1000, endedAt: 61000, elapsedSeconds: 60, totalSeconds: 1500, remainingSeconds: 1440, state: 'completed' };
const idle: FocusTimerState = { mode:'Custom', phase:'focus', running:false, secondsLeft:1500, totalSeconds:1500, elapsedSeconds:0, subjectId:'chem', taskTitle:'', cycleCount:0, miniVisible:false, completionModalOpen:false, lastCompletedMinutes:25 };
const history: FocusHistoryItem = {id:'pc', subjectId:'chem', taskTitle:'PC', mode:'Custom', durationMinutes:1, completedAt:'2026-11-24', qualityRating:3, startedAtMs:2000, endedAtMs:50000, source:'pc'};
test('offline record validation rejects bad identity and duration', () => {
  assert.equal(validOfflineRecord(record),true);
  assert.equal(validOfflineRecord({...record,id:'bad'}),false);
  assert.equal(validOfflineRecord({...record,remainingSeconds:99999}),false);
});
test('independent completed phone session imports once', () => {
  assert.equal(resolveOfflineFocus(record,idle,[],100000),'imported');
  assert.equal(resolveOfflineFocus(record,idle,[{...history,id:record.id}],100000),'imported');
});
test('overlapping PC history wins, even when PC timer is idle', () => {
  assert.equal(resolveOfflineFocus(record,idle,[history],100000),'pc-wins');
  assert.equal(resolveOfflineFocus({...record,startedAt:60000,endedAt:120000},idle,[history],150000),'imported');
});
test('active PC wins over an active phone session; otherwise phone is adopted', () => {
  const active = {...record,state:'running' as const};
  assert.equal(resolveOfflineFocus(active,idle,[],100000),'adopted');
  assert.equal(resolveOfflineFocus(active,{...idle,running:true,startedAtMs:30000},[],100000),'pc-wins');
  assert.equal(resolveOfflineFocus(active,{...idle,running:true,mobileRunId:record.id},[],100000),'adopted');
});
test('same calendar session is not duplicated', () => {
  assert.equal(resolveOfflineFocus({...record,calendarSessionId:'class'},idle,[{...history,calendarSessionId:'class',startedAtMs:90000,endedAtMs:150000}],160000),'pc-wins');
});
