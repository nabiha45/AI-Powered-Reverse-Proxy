import { pool } from './database';
import { findRule } from './rules';

jest.mock('./database', () => ({
  pool: { query: jest.fn() },
}));

const query = pool.query as jest.Mock;

describe('findRule', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('checks the allowlist first and does not check blocks after a match', async () => {
    query.mockResolvedValueOnce({
      rows: [{ ip: '127.0.0.1' }],
    });

    const result = await findRule('127.0.0.1');

    expect(result).toMatchObject({
      decision: 'allow',
      source: 'rule',
    });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      'SELECT ip FROM allow_rules WHERE ip = $1',
      ['127.0.0.1'],
    );
  });
  it('blocks an IP when there is no allowlist match and an active block exists', async () => {
  query
    .mockResolvedValueOnce({ rows: [] }) // No allowlist match
    .mockResolvedValueOnce({ rows: [{ reason: 'Manual block' }] });

  const result = await findRule('127.0.0.1');

  expect(result).toEqual({
    decision: 'block',
    source: 'rule',
    reason: 'Manual block',
  });
  expect(query).toHaveBeenCalledTimes(2);
  expect(query.mock.calls[1][0]).toContain('FROM blocks');
});
});