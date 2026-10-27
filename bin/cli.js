#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { checkSsl } from '../src/index.js';

const HELP = `Usage: ssl-checker <host[:port] | url> [host ...] [options]

Connects over TLS and checks the certificate: expiry, host name match, trust
chain and missing intermediates, self-signed certificates, key size and the
negotiated protocol and cipher.

Options:
  --warn-days <n>   Warn when the certificate expires within n days (default: 21)
  --file <path>     Check every host in a file (one per line)
  --chain           Print the whole certificate chain
  --json            Print JSON
  --strict          Exit with code 1 on warnings too
  -h, --help        Show this help

Online version (no install): https://promopilot.link/en/tools/ssl-checker.php?utm_source=github&utm_medium=cli&utm_campaign=tools&utm_content=ssl-checker
`;

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const value = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
if (!args.length || flag('-h') || flag('--help')) { process.stdout.write(HELP); process.exit(args.length ? 0 : 2); }

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
const ICON = { error: c(31, '✖'), warning: c(33, '!'), info: c(36, 'i') };
const valued = new Set(['--warn-days', '--file']);
const hosts = args.filter((a, i) => !a.startsWith('-') && !valued.has(args[i - 1]));
if (value('--file')) hosts.push(...readFileSync(value('--file'), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')));

let failing = 0;
const reports = [];
for (const h of hosts) {
  try {
    const r = await checkSsl(h, { warnDays: Number(value('--warn-days') || 21) });
    reports.push(r);
    failing += r.issues.filter((i) => i.level === 'error' || (flag('--strict') && i.level === 'warning')).length;
    if (flag('--json')) continue;
    const cert = r.certificate;
    const days = r.daysLeft < 0 ? c(31, `expired ${-r.daysLeft} days ago`) : c(r.daysLeft <= 21 ? 33 : 32, `${r.daysLeft} days left`);
    console.log(`${c(1, 'Host:')}       ${r.host}:${r.port}`);
    console.log(`${c(1, 'Subject:')}    ${cert.subject}${cert.names.length > 1 ? c(2, `  (+${cert.names.length - 1} names)`) : ''}`);
    console.log(`${c(1, 'Issuer:')}     ${cert.issuer}${cert.issuerOrganization ? ` (${cert.issuerOrganization})` : ''}`);
    console.log(`${c(1, 'Valid:')}      ${cert.validFrom.slice(0, 10)} → ${cert.validTo.slice(0, 10)}, ${days}`);
    console.log(`${c(1, 'Key:')}        ${cert.keyType?.toUpperCase()} ${cert.keyBits ?? ''}`);
    console.log(`${c(1, 'Connection:')} ${r.protocol}, ${r.cipher}${r.alpn ? `, ALPN ${r.alpn}` : ''}`);
    if (flag('--chain')) r.chain.forEach((x, i) => console.log(`  ${c(2, String(i))}  ${x.subject}  ${c(2, `← ${x.issuer}, until ${x.validTo.slice(0, 10)}`)}`));
    console.log('');
    if (!r.issues.length) console.log(c(32, '✔ Certificate looks good'));
    for (const i of r.issues) console.log(`  ${ICON[i.level]} ${i.message}`);
    if (hosts.length > 1) console.log(c(2, '─'.repeat(60)));
  } catch (err) {
    failing++;
    reports.push({ host: h, error: err.code || err.message });
    if (!flag('--json')) console.error(c(31, `${h}: ${err.code || err.message}`));
  }
}
if (flag('--json')) console.log(JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 2));
process.exit(hosts.length ? (failing ? 1 : 0) : 2);
