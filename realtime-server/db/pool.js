// ============================================================
// تجمّع اتصالات PostgreSQL (Connection Pool)
// المطوّر: عبدالله زايد الجسار
//
// تجمّع واحد مشترك للسيرفر الحي بالكامل. حدّ أقصى محسوب حتى لا
// نستنزف اتصالات قاعدة البيانات وقت الذروة — عنصر أساسي في
// صمود النظام تحت الضغط.
// ============================================================
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 15,                       // سقف الاتصالات المتزامنة
  idleTimeoutMillis: 30_000,     // تحرير الاتصال الخامل بعد 30 ثانية
  connectionTimeoutMillis: 5_000,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false },   // مطلوب لمزوّدات مثل Neon
});

pool.on('error', (err) => {
  // خطأ على اتصال خامل يجب ألّا يُسقط العملية بأكملها.
  console.error('[pool] unexpected idle client error', err.message);
});

module.exports = { pool };
