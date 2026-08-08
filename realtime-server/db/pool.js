const { Pool } = require('pg');

// A single shared pool, reused across every query. Without pooling, each
// request/interval tick would open its own connection and a busy shift
// (many dispatchers + the simulation loop) would exhaust Postgres' max
// connections quickly. `max` should stay below your DB plan's connection
// ceiling, leaving headroom for the frontend's own serverless queries.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  // A background error on an idle client should never crash the process —
  // log it and let the pool recover the connection on the next checkout.
  console.error('[db] unexpected pool error', err.message);
});

module.exports = { pool };
