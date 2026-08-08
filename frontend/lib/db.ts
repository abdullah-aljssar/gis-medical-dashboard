import { Pool } from 'pg';

// On Vercel, every API route invocation can spin up a separate serverless
// instance, each with its own small pool. This does NOT behave like a
// single long-running server's pool — under real load you want an external
// connection pooler in front of Postgres (e.g. Neon's built-in pooler, or
// pgBouncer) rather than relying on this pool alone. Documented here rather
// than hidden, per the project's "no fabricated capabilities" requirement.
declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

export const pool =
  global._pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== 'production') {
  global._pgPool = pool;
}
