import { X509Certificate } from 'node:crypto';

/** Does a certificate name (possibly a wildcard) cover a host? */
export function nameMatches(pattern, host) {
  const p = pattern.toLowerCase();
  const h = host.toLowerCase();
  if (!p.startsWith('*.')) return p === h;
  const rest = p.slice(2);
  return h.endsWith(`.${rest}`) && !h.slice(0, -rest.length - 1).includes('.');
}

/** Summarise one certificate. */
export function describeCertificate(pemOrDer) {
  const cert = pemOrDer instanceof X509Certificate ? pemOrDer : new X509Certificate(pemOrDer);
  const names = (cert.subjectAltName || '').split(',').map((s) => s.trim()).filter((s) => s.startsWith('DNS:')).map((s) => s.slice(4));
  const cn = /(?:^|\n)CN=([^\n]+)/.exec(cert.subject)?.[1] || null;
  const key = cert.publicKey.asymmetricKeyDetails || {};
  return {
    subject: cn, organization: /(?:^|\n)O=([^\n]+)/.exec(cert.subject)?.[1] || null,
    issuer: /(?:^|\n)CN=([^\n]+)/.exec(cert.issuer)?.[1] || cert.issuer, issuerOrganization: /(?:^|\n)O=([^\n]+)/.exec(cert.issuer)?.[1] || null,
    names: names.length ? names : cn ? [cn] : [],
    validFrom: new Date(cert.validFrom).toISOString(), validTo: new Date(cert.validTo).toISOString(),
    serialNumber: cert.serialNumber, fingerprint256: cert.fingerprint256,
    keyType: cert.publicKey.asymmetricKeyType, keyBits: key.modulusLength || (key.namedCurve ? { prime256v1: 256, secp384r1: 384, secp521r1: 521 }[key.namedCurve] : null),
    selfSigned: cert.subject === cert.issuer && cert.checkIssued(cert),
  };
}

/**
 * Turn connection facts into issues.
 * @param {{host: string, leaf: ReturnType<typeof describeCertificate>, chain?: object[], authorized?: boolean, authorizationError?: string|null, protocol?: string|null}} facts
 * @param {{now?: Date, warnDays?: number}} [options]
 */
export function assessTls(facts, options = {}) {
  const now = options.now || new Date();
  const warnDays = options.warnDays ?? 21;
  const issues = [];
  const add = (level, code, message) => issues.push({ level, code, message });
  const { leaf } = facts;
  const daysLeft = Math.floor((new Date(leaf.validTo) - now) / 864e5);
  if (new Date(leaf.validFrom) > now) add('error', 'not-yet-valid', `The certificate is not valid until ${leaf.validFrom.slice(0, 10)}.`);
  if (daysLeft < 0) add('error', 'expired', `The certificate expired ${-daysLeft} days ago (${leaf.validTo.slice(0, 10)}).`);
  else if (daysLeft <= warnDays) add('warning', 'expiring', `The certificate expires in ${daysLeft} days (${leaf.validTo.slice(0, 10)}).`);
  if (!leaf.names.some((n) => nameMatches(n, facts.host))) add('error', 'name-mismatch', `The certificate is for ${leaf.names.slice(0, 4).join(', ')}, not ${facts.host}.`);
  if (leaf.selfSigned) add('error', 'self-signed', 'The certificate is self-signed; browsers will show a warning.');
  else if (facts.authorized === false && facts.authorizationError) {
    const incomplete = /UNABLE_TO_VERIFY_LEAF_SIGNATURE|UNABLE_TO_GET_ISSUER_CERT/.test(facts.authorizationError);
    if (incomplete) add('error', 'incomplete-chain', 'The server does not send the intermediate certificate(s); some clients cannot verify the chain.');
    else if (!/CERT_HAS_EXPIRED|ERR_TLS_CERT_ALTNAME_INVALID/.test(facts.authorizationError)) add('error', 'untrusted', `The certificate chain is not trusted: ${facts.authorizationError}.`);
  }
  if (leaf.keyType === 'rsa' && leaf.keyBits && leaf.keyBits < 2048) add('error', 'weak-key', `RSA key is only ${leaf.keyBits} bits.`);
  if (facts.protocol && /^(SSLv3|TLSv1|TLSv1\.1)$/.test(facts.protocol)) add('error', 'old-protocol', `The connection used ${facts.protocol}, which is deprecated.`);
  else if (facts.protocol === 'TLSv1.2') add('info', 'no-tls13', 'The server negotiated TLS 1.2; enabling TLS 1.3 is faster and more secure.');
  return { daysLeft, issues };
}
