const { DatabaseSync } = require('node:sqlite');
const { existsSync } = require('node:fs');
const { setTimeout: delay } = require('node:timers/promises');

function readReceipt(file) {
  if (!existsSync(file)) return;
  let database;
  try {
    database = new DatabaseSync(file, { readOnly: true });
    database.exec('PRAGMA busy_timeout = 5000');
    const table = database.prepare("SELECT 1 FROM sqlite_master WHERE name='documents'").get();
    const row = table && database.prepare("SELECT data FROM documents WHERE name='assistant_usage'").get();
    return row ? JSON.parse(row.data) : undefined;
  } catch (error) {
    const code = error.errcode & 0xff;
    if (code !== 5 && code !== 6) throw error;
  } finally {
    database?.close();
  }
}

async function main(file) {
  const deadline = Date.now() + 300_000;
  while (Date.now() < deadline) {
    const result = readReceipt(file);
    if (result) {
      if (!result.passed) throw new Error('Windows acceptance failed at ' + result.stage);
      console.log('PASS: ' + result.stage);
      return;
    }
    await delay(1000);
  }
  throw new Error(existsSync(file) ? 'Windows fixture wrote no acceptance receipt' : 'Windows fixture did not create its disposable database');
}
main(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1; });
