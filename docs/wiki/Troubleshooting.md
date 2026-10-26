# Troubleshooting

## ECONNREFUSED or timeout

Nothing listens on that port, or a firewall blocks you. Check the port (`host:8443`) and that the service is reachable from where you run the tool.

## "is for … not <host>"

The server presents a certificate for different names — often the default certificate of a shared host because the host name is not configured there. Add the name to the certificate or the virtual host.

## Results differ from an online scanner

Different trust stores and client capabilities. This tool uses Node's bundled CA list and a modern TLS client; legacy protocol support is not probed.

## Still stuck?

Open an [issue](https://github.com/ksanyok/ssl-checker/issues/new/choose) with the command, the output (`--json` if possible) and your Node.js version — or compare with the [online version](https://promopilot.link/en/tools/ssl-checker.php?utm_source=github&utm_medium=repo&utm_campaign=tools&utm_content=ssl-checker).
