# AI-Powered-Reverse-Proxy

## Proxy response headers (P2, P3)

The proxy preserves the upstream response status, body, and end-to-end headers. HTTP connection headers such as `Connection` and `Keep-Alive` apply to a single network connection, so they may differ between the upstream-to-proxy and proxy-to-client connections. The proxy also adds `X-Request-ID` to the response as required by P3.

For P3, the proxy generates a UUID and sends it to the upstream as `X-Request-ID`. An upstream may have its own request-ID middleware and return a different `X-Request-ID` in its response; the header is a convention, not a guarantee that every server reuses the incoming value. The response to the client must echo the proxy-generated UUID, even if the upstream returns another ID.

For P5, the proxy uses a 5-second upstream timeout because the assessment does not specify one. When it expires, the proxy returns HTTP 504 with a JSON error.
