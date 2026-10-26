# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-26

### Added
- `ssl-checker` CLI for one or many hosts (`--file`), custom ports, `--warn-days`, `--chain`, `--json`, `--strict`
- TLS connection with SNI and ALPN that reads the full chain even when the certificate is invalid
- Certificate details: subject, SANs, issuer, validity, serial, SHA-256 fingerprint, key type and size
- Checks: expired, expiring soon, not yet valid, host name mismatch with RFC 6125 wildcard rules, self-signed, missing intermediates, untrusted chain, weak RSA keys, deprecated TLS versions
- Library API (`checkSsl`, `connect`, `describeCertificate`, `assessTls`, `nameMatches`) and GitHub Action

[1.0.0]: https://github.com/ksanyok/ssl-checker/releases/tag/v1.0.0
