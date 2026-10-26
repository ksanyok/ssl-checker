# SSL Checker

`ssl-checker` opens a TLS connection the way a browser does (with SNI and ALPN), reads the certificate chain the server actually sends and tells you what will go wrong and when: how many days are left, whether the certificate covers the host name (including wildcard rules), whether intermediates are missing, whether the chain is trusted at all, and which TLS version, cipher and HTTP protocol were negotiated. Point it at a list of hosts and run it daily to never miss a renewal again.

- **[Getting started](Getting-Started)** — install, first run, reading the output
- **[FAQ](FAQ)** — common questions
- **[Troubleshooting](Troubleshooting)** — errors and how to fix them

Prefer a browser? The same check runs online at **[PromoPilot](https://promopilot.link/en/tools/ssl-checker.php?utm_source=github&utm_medium=repo&utm_campaign=tools&utm_content=ssl-checker)** — free, no sign-up.
