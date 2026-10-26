import tls from 'node:tls';
import { X509Certificate } from 'node:crypto';
import { describeCertificate, assessTls } from './analyze.js';

export { describeCertificate, assessTls, nameMatches } from './analyze.js';

function parseTarget(input) {
  const s = String(input || '').trim();
  if (!s) throw new TypeError('A host name is required');
  const u = new URL(/^[a-z]+:\/\//i.test(s) ? s : `https://${s}`);
  return { host: u.hostname, port: Number(u.port) || 443 };
}

/** Open a TLS connection and collect the certificate chain without failing on invalid certificates. */
export function connect(host, port, options = {}) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: false, timeout: options.timeout ?? 10000, ALPNProtocols: ['h2', 'http/1.1'] }, () => {
      const chain = [];
      let cert = socket.getPeerCertificate(true);
      const seen = new Set();
      while (cert && cert.raw && !seen.has(cert.fingerprint256)) {
        seen.add(cert.fingerprint256);
        chain.push(new X509Certificate(cert.raw));
        cert = cert.issuerCertificate;
      }
      const result = { chain, authorized: socket.authorized, authorizationError: socket.authorizationError ? String(socket.authorizationError.code || socket.authorizationError) : null, protocol: socket.getProtocol(), cipher: socket.getCipher()?.name || null, alpn: socket.alpnProtocol || null };
      socket.end();
      resolve(result);
    });
    socket.on('timeout', () => { socket.destroy(); reject(new Error(`Connection to ${host}:${port} timed out`)); });
    socket.on('error', reject);
  });
}

/**
 * Check the TLS certificate of a host.
 * @param {string} target host, host:port or URL
 * @param {{warnDays?: number, timeout?: number, connect?: typeof connect, now?: Date}} [options]
 */
export async function checkSsl(target, options = {}) {
  const { host, port } = parseTarget(target);
  const conn = await (options.connect || connect)(host, port, options);
  if (!conn.chain.length) throw new Error('The server did not present a certificate');
  const leaf = describeCertificate(conn.chain[0]);
  const chain = conn.chain.map((c) => describeCertificate(c));
  const { daysLeft, issues } = assessTls({ host, leaf, chain, authorized: conn.authorized, authorizationError: conn.authorizationError, protocol: conn.protocol }, options);
  return { host, port, protocol: conn.protocol, cipher: conn.cipher, alpn: conn.alpn, authorized: conn.authorized, daysLeft, certificate: leaf, chain, issues, ok: !issues.some((i) => i.level === 'error') };
}
