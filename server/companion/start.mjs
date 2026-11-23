import { createCompanionRelay } from './relay.mjs';

const server = createCompanionRelay(
  process.env.STUDYFLOW_RELAY_DB ?? 'studyflow-companion.sqlite',
  process.env.STUDYFLOW_RELAY_ENROLLMENT_KEY,
);

const host = process.env.STUDYFLOW_RELAY_HOST ?? '127.0.0.1';
const port = Number(process.env.STUDYFLOW_RELAY_PORT ?? '8475');
server.listen(port, host, () => console.log(`StudyFlow companion relay listening on ${host}:${port}`));
