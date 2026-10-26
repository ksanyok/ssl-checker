# FAQ

## Why does my site work in the browser but fail here?

Usually a missing intermediate certificate. Browsers often fill the gap from cache or by downloading it; most other clients do not. Install the full chain (often `fullchain.pem`) on the server.

## Does a wildcard certificate cover the bare domain?

No. `*.example.com` covers `www.example.com` and `shop.example.com` but not `example.com` and not `a.b.example.com`. Most certificates list the bare domain as a separate name.

## Can I check non-HTTPS services like SMTP or IMAP?

Services with implicit TLS work with a port: `ssl-checker mail.example.com:993` or `:465`. STARTTLS (port 25/587) is not supported.

## What warning period should I use?

Let's Encrypt certificates renew 30 days before expiry, so `--warn-days 21` catches a failed renewal with three weeks to spare. For yearly commercial certificates use 30–45.

## Does it check revocation?

No. OCSP/CRL checks are not performed; the tool focuses on the problems that cause outages.
