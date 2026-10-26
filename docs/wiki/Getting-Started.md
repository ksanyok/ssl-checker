# Getting started

## Requirements

Node.js 18 or newer. No other dependencies.

## Install

```bash
# one-off run
npx github:ksanyok/ssl-checker example.com

# global CLI
npm install -g github:ksanyok/ssl-checker

# as a library in your project
npm install github:ksanyok/ssl-checker
```

## First run

```bash
ssl-checker example.com
```

For each host you get the subject (and how many other names the certificate covers), issuer, validity period with days left, key type and size, and the negotiated protocol, cipher and ALPN. Problems follow: `✖` means clients will refuse the connection, `!` that they soon will, `i` optional improvements.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | No errors (warnings allowed unless `--strict`) |
| 1 | Errors found (or warnings with `--strict`) |
| 2 | Bad arguments or the check could not run |

## More examples

**Check several hosts and a custom port**

```bash
ssl-checker example.com api.example.com mail.example.com:993
```

**Warn 30 days ahead and fail the job on warnings**

```bash
ssl-checker --file hosts.txt --warn-days 30 --strict
```

**Inspect the chain the server sends**

```bash
ssl-checker example.com --chain
```

## Without installing anything

Use the [online SSL Checker](https://promopilot.link/en/tools/ssl-checker.php?utm_source=github&utm_medium=repo&utm_campaign=tools&utm_content=ssl-checker).
