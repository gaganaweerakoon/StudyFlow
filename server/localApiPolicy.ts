import type { IncomingMessage } from 'node:http';

// An untrusted proxy header is never proof of a local client.
export function isLoopbackApiClient(req: Pick<IncomingMessage, 'headers' | 'socket'>): boolean {
  const remote = req.socket.remoteAddress;
  if (!remote || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)) return false;
  if (req.headers.forwarded || req.headers['x-forwarded-for'] || req.headers['x-forwarded-host']) return false;
  const host = req.headers.host ?? '';
  if (!/^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i.test(host)) return false;
  if (req.headers['sec-fetch-site'] === 'cross-site') return false;
  if (req.headers.origin) {
    try {
      const origin = new URL(req.headers.origin);
      if (!['http:', 'https:'].includes(origin.protocol) || origin.host.toLowerCase() !== host.toLowerCase()) return false;
    } catch { return false; }
  }
  return true;
}

export function allowLocalServerKey(clientKey: string | undefined, req: Pick<IncomingMessage, 'headers' | 'socket'>, serverKey: () => string): string {
  return clientKey?.trim() || (isLoopbackApiClient(req) ? serverKey() : '');
}
