import { useState, type FormEvent } from 'react';

function App() {
  const [enteredToken, setEnteredToken] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const response = await fetch('/api/stats', {
        headers: { Authorization: `Bearer ${enteredToken}` },
      });

      if (response.status === 401) {
        setError('Invalid admin token');
        return;
      }
      if (!response.ok) {
        throw new Error('Admin API unavailable');
      }

      setToken(enteredToken);
      setEnteredToken('');
    } catch {
      setError('Could not connect to the admin API');
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    setToken(null);
  }

  if (token) {
    return <main><h1>RevAI dashboard</h1><button onClick={handleLogout}>Log out</button></main>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 text-[#f2eeee]">
      <div className="w-full max-w-md">
        <div className="mb-9 text-center">
          <p className="text-5xl font-bold tracking-tight text-white">Rev<span className="text-[#bd5b69]">AI</span></p>
          <p className="mt-3 text-sm text-[#a59a9c]">Security decisions, under your control.</p>
        </div>
        <div className="rounded-2xl border border-[#38282c] bg-[#151112]/95 p-7 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-9">
          <div className="mb-6 h-1 w-10 rounded-full bg-[#7c1d30]" aria-hidden="true" />
          <h1 className="text-2xl font-semibold tracking-tight">Admin login</h1>
          <p className="mt-2 text-sm leading-6 text-[#a59a9c]">Enter your admin token to view and manage traffic.</p>
          <form onSubmit={handleLogin} className="mt-7 space-y-5">
            <div>
              <label htmlFor="admin-token" className="mb-2 block text-sm font-medium text-[#e5dcde]">Admin token</label>
              <input
                id="admin-token"
                type="password"
                autoComplete="off"
                value={enteredToken}
                onChange={(event) => setEnteredToken(event.target.value)}
                required
                className="w-full rounded-lg border border-[#49363a] bg-[#0c0a0b] px-4 py-3 text-white outline-none transition placeholder:text-[#786b6e] focus:border-[#a64658] focus:ring-2 focus:ring-[#632231]"
                placeholder="Enter token"
              />
            </div>
            {error && <p role="alert" className="rounded-lg border border-[#843344] bg-[#39151e] px-4 py-3 text-sm text-[#f4cbd2]">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-[#711b2d] px-4 py-3 font-semibold text-white transition hover:bg-[#8a263a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bd5b69] disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? 'Checking...' : 'Log in'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default App;
