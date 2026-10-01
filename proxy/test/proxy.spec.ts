describe('running proxy', () => {
  it('forwards a request to the upstream with its request ID', async () => {
    const response = await fetch('http://127.0.0.1:8080/echo?integration=1');

    const body = (await response.json()) as {
      method: string;
      path: string;
      query: string;
      headers: Record<string, string>;
    };
    const requestId = response.headers.get('x-request-id');

    expect(response.status).toBe(200);
    expect(body.method).toBe('GET');
    expect(body.path).toBe('/echo');
    expect(body.query).toBe('?integration=1');
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(body.headers['x-request-id']).toBe(requestId);
    expect(body.headers['x-forwarded-for']).toBeTruthy();
  });

  it('blocks a SQL injection request before it reaches the upstream', async () => {
    const response = await fetch('http://127.0.0.1:8080/echo?q=union%20select');

    const body = (await response.json()) as {
      blocked: boolean;
      requestId: string;
      reason: string;
    };
    const requestId = response.headers.get('x-request-id');

    expect(response.status).toBe(403);
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(body).toEqual({
      blocked: true,
      requestId,
      reason: 'The request contains a SQL injection indicator.',
    });
  });
});
