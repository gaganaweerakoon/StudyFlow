// PIP_DRIVER points to a test-only Playwright installation outside the app.
const { chromium } = require(process.env.PIP_DRIVER || 'playwright-core');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { setTimeout: pause } = require('node:timers/promises');

async function until(read, predicate, label) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const result = await read();
    if (predicate(result)) return result;
    await pause(250);
  }
  throw Error('Timed out waiting for ' + label);
}

async function main() {
  const native = Boolean(process.env.PIP_NATIVE_DB);
  const browser = native ? await chromium.connectOverCDP('http://127.0.0.1:9222') :
    await chromium.launch({executablePath:process.env.PIP_CHROMIUM, args:['--no-sandbox']});
  try {
    const page = native ? browser.contexts()[0].pages()[0] : await browser.newPage();
    page.setDefaultTimeout(120000);
    const notePrompt = 'Save a Sinhala note from the attached PDF in Chemistry Unit 1. Explain oxidation and reduction in Sinhala.';
    let attempts = 0;
    if (!native) {
      await page.route('**/api/study-assistant/status', route => route.fulfill({json:{geminiConfigured:true}}));
      await page.route('**/api/study-assistant/chat', route => {
        const req = route.request().postDataJSON();
        let events = [{type:'text',text:'Redox review'}];
        if (req.allowedTools?.includes('create_event')) events = [{type:'action',action:'create_event',arguments:{title:'Sample lesson',date:'2027-01-10',startHour:9,durationHours:1,subjectId:'chem'}}];
        if (req.prompt === notePrompt && req.workspaceActions) {
          assert.deepEqual(req.allowedTools,['create_note']);
          if (++attempts === 1) return route.fulfill({status:502,json:{message:'Test provider outage'}});
          assert.ok(req.documents[0].pdfBase64.startsWith('JVBER'));
          events = [{type:'action',action:'create_event',arguments:{title:'Wrong event',date:'2027-01-11',startHour:12,durationHours:1}},
            {type:'action',action:'create_note',arguments:{title:'රෙඩොක්ස්',content:'ඔක්සිකරණයේදී ඉලෙක්ට්‍රෝන ඉවත් වේ.',subjectId:'wrong'}}];
        }
        return route.fulfill({contentType:'application/x-ndjson',body:[...events,{type:'done'}].map(e=>JSON.stringify(e)).join('\n')+'\n'});
      });
      await page.goto('http://127.0.0.1:4173/tests/pip/');
    }
    function read() {
      if (!native) return page.evaluate(() => JSON.parse(localStorage.getItem('disposable') ?? 'null'));
      const db = new DatabaseSync(process.env.PIP_NATIVE_DB,{readOnly:true});
      try { return JSON.parse(db.prepare("SELECT data FROM documents WHERE name='workspace'").get()?.data ?? 'null'); }
      finally { db.close(); }
    }
    const box = page.getByRole('textbox',{name:'Message Pip'});
    await page.getByText('Gemini configured',{exact:true}).waitFor();
    await box.fill('Schedule a Chemistry event named Sample lesson on January 10 2027 at 09:00 for one hour.');
    await box.press('Enter');
    const scheduled = await until(read, s=>s?.sessions?.length === 1,'durable event');
    await page.locator('input[type=file]').setInputFiles(path.join(__dirname,'redox.pdf'));
    await page.getByText('redox.pdf',{exact:true}).first().waitFor();
    await box.fill(notePrompt);
    await box.press('Enter');
    if (!native) await page.getByRole('button',{name:'Retry',exact:true}).click();
    const saved = await until(read,s=>s?.notes?.length === 1,'durable note');
    assert.deepEqual(saved.sessions,scheduled.sessions);
    const note = saved.notes[0];
    assert.equal(note.subjectId,'chem');
    assert.deepEqual(note.syllabusLinks.unitIds,['redox']);
    assert.match(note.content,/[\u0D80-\u0DFF]/u);
    await page.getByRole('button',{name:'Open note',exact:true}).click();
    assert.equal(await page.locator('output').getAttribute('data-note'), note.id);
    if (!native) {
      assert.equal(attempts, 2);
      await page.getByText('Back to Pip').click();
      const request = page.waitForRequest(r=>r.url().endsWith('/chat') && r.postDataJSON()?.prompt === notePrompt);
      await page.getByRole('button',{name:'Regenerate reply'}).last().click();
      const replay = (await request).postDataJSON();
      assert.deepEqual(replay.allowedTools, []);
      assert.ok(replay.documents[0].pdfBase64);
      await page.getByText('Redox review',{exact:true}).last().waitFor();
      assert.equal((await read()).notes.length, 1);
    }
    await page.reload();
    const reopened = await read();
    assert.equal(reopened.notes.length,1);
    assert.deepEqual(reopened.sessions,scheduled.sessions);
    console.log('PASS: single Sinhala note, verified subject/unit and exact-item link, unchanged calendar after reopen.');
  } finally { await browser.close(); }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
