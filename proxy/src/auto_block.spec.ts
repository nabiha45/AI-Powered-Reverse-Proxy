import { pool } from './database';
import { createAutoBlockIfNeeded } from './auto_block';

jest.mock('./database', () => ({
  pool: { query: jest.fn() },
}));

const query = pool.query as jest.Mock;

describe('createAutoBlockIfNeeded', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('does not create a block below the threshold', async () => {
    query.mockResolvedValueOnce({ rows: [{ count: 4 }] });

    await createAutoBlockIfNeeded('127.0.0.1', 5, 10, 30);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain("source = 'ai'");
  });

  it('creates a temporary auto block when the threshold is reached', async () => {
  query
    .mockResolvedValueOnce({ rows: [{ count: 5 }] })
    .mockResolvedValueOnce({ rows: [] });

  await createAutoBlockIfNeeded('127.0.0.1', 5, 10, 30);

  expect(query).toHaveBeenCalledTimes(2);
  expect(query.mock.calls[1][0]).toContain('INSERT INTO blocks');
  expect(query.mock.calls[1][0]).toContain("WHERE blocks.source = 'auto'");
  expect(query.mock.calls[1][1]).toEqual([
    '127.0.0.1',
    'Automatic block after 5 AI blocks in 10 minutes',
    30,
  ]);
});
});