import assert from 'node:assert/strict';
import test from 'node:test';
import {computeWorkspaceDiagnostics, findOpenSlotsForDay, type WorkspaceDiagnosticsInput} from './workspaceDiagnostics';
import type {StudySession, TaskItem, QuizQuestion} from '../types/studyflow';
const day='2026-11-26';
const empty: WorkspaceDiagnosticsInput={subjects:[],tasks:[],sessions:[],exams:[],goals:[],notes:[],decks:[],flashcards:[],quizzes:[],focusHistory:[]};
const block=(id:string,date:string,startHour:number,durationHours:number,overrides:Partial<StudySession>={}):StudySession=>({id,title:id,subjectId:'',dayIndex:0,date,startHour,durationHours,status:'upcoming',...overrides});
const task=(i:number):TaskItem=>({id:`task-${i}`,title:`Task ${i}`,subjectId:'',dueDate:'2026-11-24',dueLabel:'',priority:'medium',status:'todo',estimatedMinutes:10,description:'',subtasks:[]});

test('overnight plan and available slots include the previous day block',()=>{
 const sessions=[block('overnight','2026-11-25',23,11),block('free',day,11,1,{blockType:'free',countsTowardStudy:false}),block('class',day,13,2)];
 const d=computeWorkspaceDiagnostics({...empty,sessions},day,8);
 assert.equal(d.todayPlannedHours,12);
 assert.equal(d.todaySessionsCount,3);
 assert.equal(d.upcomingSessionsCount,2);
 assert.equal(findOpenSlotsForDay(sessions,day,8,18)[0].startHour,10);
});
test('completed, missed, ended and personal blocks do not count as upcoming',()=>{
 const sessions=[block('ended',day,6,1),block('completed',day,14,1,{status:'completed'}),block('missed',day,15,1,{status:'missed'}),block('sleep',day,18,1,{blockType:'sleep'}),block('next',day,16,1)];
 assert.equal(computeWorkspaceDiagnostics({...empty,sessions},day,8).upcomingSessionsCount,1);
});
test('overdue total is distinct from limited preview',()=>{
 const d=computeWorkspaceDiagnostics({...empty,tasks:Array.from({length:9},(_,i)=>task(i))},day,8);
 assert.equal(d.overdueTasksCount,9);assert.equal(d.overdueTasks.length,6);assert.match(d.instantSummary,/9 overdue tasks/);
});
test('weak topics are derived only from incorrect answers in latest reviewed attempt',()=>{
 const q=(id:string,topic:string):QuizQuestion=>({id,topic,type:'short',prompt:'?',correctAnswer:'A',explanation:'A'});
 const questions=[q('a','correct'),q('b','incorrect'),q('c','unmarked')];
 const d=computeWorkspaceDiagnostics({...empty,quizzes:[{id:'q',title:'Q',subjectId:'',durationMinutes:10,difficulty:'Standard',lastScore:30,questions,attempts:[{at:'2026-11-25',score:30,review:{questions,answers:{},marks:{a:{correct:true,feedback:''},b:{correct:false,feedback:''}}}}]}]},day,8);
 assert.deepEqual(d.weakQuizTopics,['incorrect']);
});
