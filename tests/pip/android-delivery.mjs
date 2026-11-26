import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:https';
import { request } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { createCompanionRelay } from '../../server/companion/relay.mjs';

const app = 'io.github.gaganaweerakoon.studyflow.preview';
const adb = (args, input) => execFileSync('adb', args, { input, encoding:'utf8' });
const shell = (...args) => adb(['shell', ...args]);
const setPrefs = (name, values) => {
  const data = '<?xml version="1.0" encoding="utf-8"?><map>' + Object.entries(values)
    .map(([key, value]) => '<string name="' + key + '">' + value + '</string>').join('') + '</map>';
  adb(['shell','-T', "run-as " + app + " sh -c 'mkdir -p shared_prefs; cat > shared_prefs/" + name + ".xml'"], data);
};
const key = randomBytes(32).toString('base64url');
const relay = createCompanionRelay(':memory:', key);
const tls = createServer({ key:readFileSync(process.argv[2]), cert:readFileSync(process.argv[3]) }, (incoming, outgoing) => {
  const upstream = request({host:'127.0.0.1',port:relay.address().port,path:incoming.url,
    method:incoming.method,headers:incoming.headers}, response => {
    outgoing.writeHead(response.statusCode,response.headers);
    response.pipe(outgoing);
  });
  upstream.on('error', () => outgoing.writeHead(502).end());
  incoming.pipe(upstream);
});
async function api(path, method, credential, body) {
  const response = await fetch('http://127.0.0.1:' + relay.address().port + path, {
    method, headers:credential ? {Authorization:'Bearer ' + credential} : {}, body:JSON.stringify(body),
  });
  assert.ok(response.ok, 'Relay returned ' + response.status);
  return response.json();
}
async function waitFor(read) {
  for (let i = 0; i < 45; i++) {
    if (read()) return;
    await delay(1000);
  }
  throw Error('Native notification did not appear');
}

try {
  await new Promise(resolve => relay.listen(0,'127.0.0.1',resolve));
  await new Promise(resolve => tls.listen(8443,'127.0.0.1',resolve));
  adb(['reverse','tcp:8443','tcp:8443']);
  const {desktopToken,pairingCode} = await api('/v1/pairs','POST',key);
  const {phoneToken} = await api('/v1/claim','POST',null,{pairingCode});
  setPrefs('pip_phone_delivery',{origin:'https://localhost:8443',token:phoneToken});
  shell('pm','grant',app,'android.permission.POST_NOTIFICATIONS');
  shell('am','start','-n',app + '/io.github.gaganaweerakoon.studyflow.MainActivity');
  await waitFor(() => shell('dumpsys','jobscheduler').includes(app + '/io.github.gaganaweerakoon.studyflow.PipDeliveryJob'));
  const now = Date.now();
  await api('/v1/pip','PUT',desktopToken,{day:new Date(now).toISOString().slice(0,10), fingerprint:randomBytes(32).toString('hex'),
    kind:'milestone',observedAt:now,expiresAt:now + 60000});
  // No desktop process is running. The Android job contacts only the TLS relay.
  shell('input','keyevent','KEYCODE_HOME');
  shell('cmd','jobscheduler','run','-f',app,'7401');
  await waitFor(() => shell('dumpsys','notification','--noredact').includes('You reached a study milestone.'));
  assert.equal((await api('/v1/pip','POST',phoneToken,{})).delivery,null);
  console.log('PASS: native Android JobService posted one notification from the relay with no desktop process.');
} finally {
  tls.close();
  relay.close();
}
