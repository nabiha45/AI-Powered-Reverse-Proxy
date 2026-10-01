import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiRequest, ApiError, type Block, type RequestDetail, type RequestPage, type Review, type Stats } from './api';

const panel = 'rounded-2xl border border-[#38282c] bg-[#151112]/95 p-5 sm:p-6';
const input = 'rounded-lg border border-[#49363a] bg-[#0c0a0b] px-3 py-2 text-sm text-white outline-none focus:border-[#a64658] focus:ring-2 focus:ring-[#632231]';
const primaryButton = 'rounded-lg bg-[#711b2d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8a263a] disabled:cursor-wait disabled:opacity-60';
const quietButton = 'rounded-lg border border-[#49363a] px-3 py-2 text-sm text-[#e5dcde] transition hover:border-[#a64658] disabled:opacity-50';

function showTime(value: string) {
  return new Date(value).toLocaleString();
}

function timeLeft(expiresAt: string | null, now: number) {
  if (!expiresAt) return 'No expiry';
  const minutes = Math.ceil((new Date(expiresAt).getTime() - now) / 60_000);
  if (minutes <= 0) return 'Expired';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
}

export default function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [requests, setRequests] = useState<RequestPage | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [decision, setDecision] = useState('');
  const [ipDraft, setIpDraft] = useState('');
  const [ipFilter, setIpFilter] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [blockIp, setBlockIp] = useState('');
  const [duration, setDuration] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(0);

  const reportError = useCallback((cause: unknown) => {
    if (cause instanceof ApiError && cause.status === 401) {
      onLogout();
      return;
    }
    setError(cause instanceof Error ? cause.message : 'Could not reach the admin API.');
  }, [onLogout]);

  const refresh = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (decision) params.set('decision', decision);
    if (ipFilter) params.set('ip', ipFilter);

    try {
      const [nextStats, nextRequests, nextBlocks] = await Promise.all([
        apiRequest<Stats>(token, '/api/stats'),
        apiRequest<RequestPage>(token, `/api/requests?${params}`),
        apiRequest<Block[]>(token, '/api/blocks'),
      ]);
      setStats(nextStats);
      setRequests(nextRequests);
      setBlocks(nextBlocks);
      setNow(Date.now());
      setError('');
    } catch (cause) {
      reportError(cause);
    }
  }, [token, page, decision, ipFilter, reportError]);

  useEffect(() => {
    const firstLoad = window.setTimeout(() => { void refresh(); }, 0);
    const timer = window.setInterval(() => { void refresh(); }, 5_000);
    return () => { window.clearTimeout(firstLoad); window.clearInterval(timer); };
  }, [refresh]);

  async function openDetail(id: string) {
    try {
      setDetail(await apiRequest<RequestDetail>(token, `/api/requests/${id}`));
    } catch (cause) {
      reportError(cause);
    }
  }

  async function createBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await apiRequest<Block>(token, '/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: blockIp.trim(), ...(duration ? { durationMinutes: Number(duration) } : {}) }),
      });
      setBlockIp('');
      setDuration('');
      await refresh();
    } catch (cause) {
      reportError(cause);
    } finally {
      setBusy(false);
    }
  }

  async function blockFromDetail(ip: string) {
    setBusy(true);
    try {
      await apiRequest<Block>(token, '/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip }),
      });
      await refresh();
    } catch (cause) {
      reportError(cause);
    } finally {
      setBusy(false);
    }
  }

  async function unblock(ip: string) {
    setBusy(true);
    try {
      await apiRequest(token, `/api/blocks/${encodeURIComponent(ip)}`, { method: 'DELETE' });
      setReview(null);
      await refresh();
    } catch (cause) {
      reportError(cause);
    } finally {
      setBusy(false);
    }
  }

  async function askReview(ip: string) {
    setBusy(true);
    setReview(null);
    try {
      setReview(await apiRequest<Review>(token, `/api/blocks/${encodeURIComponent(ip)}/review`, { method: 'POST' }));
    } catch (cause) {
      reportError(cause);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen text-[#f2eeee]">
      <header className="border-b border-[#302225] bg-[#100d0e]/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div>
            <p className="text-2xl font-bold tracking-tight text-white">Rev<span className="text-[#bd5b69]">AI</span></p>
          </div>
          <button type="button" onClick={onLogout} className={quietButton}>Log out</button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-5 py-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-2 text-sm text-[#a59a9c]">Traffic and decisions refresh every 5 seconds.</p>
        </div>
        {error && <p role="alert" className="rounded-lg border border-[#843344] bg-[#39151e] px-4 py-3 text-sm text-[#f4cbd2]">{error}</p>}

        <section aria-label="Security statistics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ['Total requests', stats?.totalRequests ?? '—'],
            ['Blocked', stats ? `${stats.blockRate}%` : '—'],
            ['AI calls', stats?.aiCalls ?? '—'],
            ['Average AI latency', stats ? `${Math.round(stats.averageAiLatencyMs)} ms` : '—'],
          ] as const).map(([label, value]) => (
            <div key={label} className={panel}>
              <p className="text-sm text-[#a59a9c]">{label}</p>
              <p className="mt-3 text-3xl font-semibold tabular-nums text-white">{value}</p>
            </div>
          ))}
        </section>

        <section className={panel} aria-labelledby="requests-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="requests-title" className="text-xl font-semibold">Request history</h2>
              <p className="mt-1 text-sm text-[#a59a9c]">Select a request to see its recorded reason and AI summary.</p>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); setPage(1); setIpFilter(ipDraft.trim()); }} className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-xs text-[#a59a9c]">
                Decision
                <select value={decision} onChange={(event) => { setDecision(event.target.value); setPage(1); }} className={input}>
                  <option value="">All</option>
                  <option value="allow">Allow</option>
                  <option value="block">Block</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs text-[#a59a9c]">
                Client IP
                <input value={ipDraft} onChange={(event) => setIpDraft(event.target.value)} placeholder="Exact IP" className={input} />
              </label>
              <button type="submit" className={quietButton}>Filter</button>
            </form>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-[#38282c] text-xs text-[#a59a9c]">
                <tr>{['Time', 'IP', 'Method', 'Path', 'Decision', 'Source', 'Confidence', 'Category', 'Latency'].map((label) => <th key={label} className="px-3 py-3 font-medium">{label}</th>)}</tr>
              </thead>
              <tbody>
                {requests?.items.map((item) => (
                  <tr key={item.id} className="border-b border-[#2b2224] hover:bg-[#211719]">
                    <td className="px-3 py-3 whitespace-nowrap"><button type="button" onClick={() => void openDetail(item.id)} className="text-left text-[#e1a0aa] underline-offset-2 hover:underline">{showTime(item.created_at)}</button></td>
                    <td className="px-3 py-3 whitespace-nowrap">{item.ip}</td>
                    <td className="px-3 py-3">{item.method}</td>
                    <td className="max-w-48 truncate px-3 py-3" title={item.path}>{item.path}</td>
                    <td className="px-3 py-3"><span className={item.decision === 'block' ? 'text-[#ed9aa7]' : 'text-[#a8d2bb]'}>{item.decision}</span></td>
                    <td className="px-3 py-3">{item.source}</td>
                    <td className="px-3 py-3 tabular-nums">{item.confidence === null ? '—' : `${item.confidence}`}</td>
                    <td className="px-3 py-3">{item.category ?? '—'}</td>
                    <td className="px-3 py-3 tabular-nums">{item.total_latency_ms} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {requests?.items.length === 0 && <p className="py-8 text-center text-sm text-[#a59a9c]">No requests match these filters.</p>}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-[#a59a9c]">
            <span>{requests ? `${requests.total} requests · page ${requests.page}` : 'Loading requests...'}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className={quietButton}>Previous</button>
              <button type="button" disabled={!requests || page * requests.limit >= requests.total} onClick={() => setPage(page + 1)} className={quietButton}>Next</button>
            </div>
          </div>
        </section>

        {detail && (
          <section className={panel} aria-labelledby="detail-title">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="detail-title" className="text-xl font-semibold">Request detail</h2>
                <p className="mt-1 break-all text-sm text-[#a59a9c]">{detail.id}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy || blocks.some((block) => block.ip === detail.ip)} onClick={() => void blockFromDetail(detail.ip)} className={primaryButton}>
                  {blocks.some((block) => block.ip === detail.ip) ? 'IP already blocked' : 'Block this IP'}
                </button>
                <button type="button" onClick={() => setDetail(null)} className={quietButton}>Close</button>
              </div>
            </div>
            <p className="mt-3 text-sm text-[#a59a9c]">IP: {detail.ip}. Blocking creates a manual block with no expiry for future requests.</p>
            <p className="mt-5 text-sm"><span className="text-[#a59a9c]">Decision:</span> {detail.decision} · {detail.source}{detail.suspicious ? ' · suspicious' : ''}</p>
            <p className="mt-3 text-sm"><span className="text-[#a59a9c]">Recorded reason:</span> {detail.reason}</p>
            <h3 className="mt-6 text-sm font-semibold">Summary sent to AI</h3>
            {detail.summary === null ? (
              <p className="mt-2 text-sm text-[#a59a9c]">No AI summary. A rule decided this request.</p>
            ) : (
              <pre className="mt-2 overflow-x-auto rounded-lg border border-[#38282c] bg-[#0c0a0b] p-4 text-xs leading-6 text-[#ddd2d4]">{JSON.stringify(detail.summary, null, 2)}</pre>
            )}
          </section>
        )}

        <section className={panel} aria-labelledby="blocks-title">
          <h2 id="blocks-title" className="text-xl font-semibold">Blocked IPs</h2>
          <p className="mt-1 text-sm text-[#a59a9c]">Manual policy stays in your control. Reviews only recommend an action.</p>
          <form onSubmit={(event) => void createBlock(event)} className="mt-5 flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs text-[#a59a9c]">IP address<input required value={blockIp} onChange={(event) => setBlockIp(event.target.value)} placeholder="203.0.113.10" className={input} /></label>
            <label className="grid gap-1 text-xs text-[#a59a9c]">Duration (minutes, optional)<input type="number" min="1" step="1" value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="No expiry" className={input} /></label>
            <button type="submit" disabled={busy} className={primaryButton}>Block IP</button>
          </form>
          <div className="mt-6 space-y-3">
            {blocks.length === 0 && <p className="text-sm text-[#a59a9c]">No active blocks.</p>}
            {blocks.map((block) => (
              <div key={block.ip} className="rounded-xl border border-[#38282c] bg-[#100d0e] p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="break-all font-medium text-white">{block.ip}</p>
                    <p className="mt-1 text-sm text-[#a59a9c]">{block.source} · {block.reason}</p>
                    <p className="mt-1 text-xs text-[#a59a9c]">Time left: {timeLeft(block.expires_at, now)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => void askReview(block.ip)} className={quietButton}>Ask AI to review</button>
                    <button type="button" disabled={busy} onClick={() => void unblock(block.ip)} className={quietButton}>Unblock</button>
                  </div>
                </div>
                {review?.ip === block.ip && (
                  <div className="mt-4 rounded-lg border border-[#54303a] bg-[#241419] p-4 text-sm">
                    <p className="font-semibold">{review.provider === 'mock' ? 'Mock review' : 'AI review'} recommends: {review.recommendation}</p>
                    <p className="mt-1 text-[#d8c8cc]">{review.reason}</p>
                    <p className="mt-2 text-xs text-[#a59a9c]">The block stays active until you accept a lift recommendation or use Unblock.</p>
                    <div className="mt-4 flex gap-2">
                      <button type="button" disabled={busy} onClick={() => { if (review.recommendation === 'lift') void unblock(block.ip); else setReview(null); }} className={primaryButton}>
                        {review.recommendation === 'lift' ? 'Accept & unblock' : 'Accept & keep block'}
                      </button>
                      <button type="button" onClick={() => setReview(null)} className={quietButton}>Dismiss</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
