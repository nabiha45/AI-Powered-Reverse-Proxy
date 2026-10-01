export const schemaSql = `

CREATE TABLE IF NOT EXISTS request_logs (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  query_string TEXT NOT NULL DEFAULT '',
  decision TEXT NOT NULL CHECK (decision IN ('allow', 'block')),
  source TEXT NOT NULL CHECK (source IN ('rule', 'ai', 'fallback')),
  confidence DOUBLE PRECISION CHECK (confidence BETWEEN 0 AND 1),
  category TEXT,
  reason TEXT NOT NULL,
  suspicious BOOLEAN NOT NULL DEFAULT FALSE,
  ai_latency_ms INTEGER,
  total_latency_ms INTEGER NOT NULL,
  summary JSONB
);
CREATE TABLE IF NOT EXISTS blocks (
  ip TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('manual', 'auto')),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS allow_rules (
  ip TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS corrections (
  request_id UUID PRIMARY KEY REFERENCES request_logs(id),
  corrected_decision TEXT NOT NULL CHECK (corrected_decision IN ('allow', 'block')),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;
