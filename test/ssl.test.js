import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { X509Certificate } from 'node:crypto';
import { checkSsl, describeCertificate, assessTls, nameMatches } from '../src/index.js';

const PEM = readFileSync(new URL('./fixtures/leaf.pem', import.meta.url), 'utf8');
const CERT = new X509Certificate(PEM);
const codes = (l) => l.map((i) => i.code);
const fakeConnect = (extra = {}) => async () => ({ chain: [CERT], authorized: false, authorizationError: 'DEPTH_ZERO_SELF_SIGNED_CERT', protocol: 'TLSv1.3', cipher: 'TLS_AES_128_GCM_SHA256', alpn: 'h2', ...extra });

test('wildcard and exact name matching', () => {
  assert.ok(nameMatches('*.example.test', 'www.example.test'));
  assert.ok(!nameMatches('*.example.test', 'a.b.example.test'));
  assert.ok(!nameMatches('*.example.test', 'example.test'));
  assert.ok(nameMatches('Example.TEST', 'example.test'));
});

test('describes a certificate', () => {
  const d = describeCertificate(PEM);
  assert.equal(d.subject, 'www.example.test');
  assert.deepEqual(d.names, ['example.test', '*.example.test']);
  assert.equal(d.keyType, 'rsa');
  assert.equal(d.keyBits, 2048);
  assert.equal(d.selfSigned, true);
});

test('assesses expiry, name and protocol', () => {
  const leaf = { ...describeCertificate(PEM), selfSigned: false };
  const ok = assessTls({ host: 'shop.example.test', leaf, authorized: true, protocol: 'TLSv1.3' });
  assert.deepEqual(ok.issues, []);
  const soon = assessTls({ host: 'example.test', leaf, authorized: true, protocol: 'TLSv1.2' }, { now: new Date(new Date(leaf.validTo) - 5 * 864e5) });
  assert.ok(codes(soon.issues).includes('expiring'));
  assert.ok(codes(soon.issues).includes('no-tls13'));
  const bad = assessTls({ host: 'other.test', leaf, authorized: false, authorizationError: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', protocol: 'TLSv1' }, { now: new Date('2200-01-01') });
  for (const code of ['expired', 'name-mismatch', 'incomplete-chain', 'old-protocol']) assert.ok(codes(bad.issues).includes(code), code);
});

test('checks a host through an injected connection', async () => {
  const r = await checkSsl('https://www.example.test:8443/path', { connect: fakeConnect() });
  assert.equal(r.host, 'www.example.test');
  assert.equal(r.port, 8443);
  assert.ok(codes(r.issues).includes('self-signed'));
  assert.equal(r.ok, false);
  assert.ok(r.daysLeft > 1000);
});

test('rejects a server without certificates', async () => {
  await assert.rejects(checkSsl('example.test', { connect: fakeConnect({ chain: [] }) }), /did not present/);
});
