// المطوّر: عبدالله زايد الجسار
// عميل Postgres لمسارات API في Next.js (stateless — مناسبة للاستضافة serverless).
// تجمّع صغير يُعاد استخدامه عبر الاستدعاءات؛ في بيئة إنتاج حقيقية يُنصح
// بمُجمّع خارجي (Neon pooler / pgBouncer) أمام قاعدة البيانات.
import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

export const pool =
  global._pgPool ??
  new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
    ssl:
      connectionString && connectionString.includes('localhost')
        ? false
        : { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== 'production') {
  global._pgPool = pool;
}
