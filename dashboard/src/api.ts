export type Stats = {
  totalRequests: number;
  blockRate: number;
  aiCalls: number;
  averageAiLatencyMs: number;
};

export type RequestRow = {
  id: string;
  created_at: string;
  ip: string;
  method: string;
  path: string;
  decision: 'allow' | 'block';
  source: 'rule' | 'ai' | 'fallback';
  confidence: number | null;
  category: string | null;
  total_latency_ms: number;
};

export type RequestPage = {
  items: RequestRow[];
  page: number;
  limit: number;
  total: number;
};

export type RequestDetail = RequestRow & {
  query_string: string;
  reason: string;
  suspicious: boolean;
  ai_latency_ms: number | null;
  summary: unknown | null;
};

export type Block = {
  ip: string;
  source: 'manual' | 'auto';
  reason: string;
  created_at: string;
  expires_at: string | null;
};

export type Review = {
  ip: string;
  provider: string;
  recommendation: 'keep' | 'lift';
  reason: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status === 401 ? 'Session expired. Log in again.' : `Request failed (${response.status}).`, response.status);
  }

  return response.json() as Promise<T>;
}
