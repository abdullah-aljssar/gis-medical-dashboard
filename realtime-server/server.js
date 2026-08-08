// ============================================================
// السيرفر الحي — Express + Socket.io
// المطوّر: عبدالله زايد الجسار
//
// يُنشر على مستضيف يدعم العمليات طويلة الأمد (Railway) — وليس على
// وظائف serverless — لأن الاتصال الدائم عبر Socket.io يتطلب عملية
// حيّة مستمرة. (انظر القرارات الهندسية في README).
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const { pool } = require('./db/pool');
const { startSimulation } = require('./simulation/engine');
const { findNearestAmbulance, assignRouteAndDispatch } = require('./simulation/routing');
const { createBroadcaster } = require('./sockets/broadcast');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_ORIGIN || '*' },
  // مضبوط للوحات تُترك مفتوحة نوبة عمل كاملة: يكشف اتصالاً ميتاً
  // دون تهوّر تجاه انقطاعات الشبكة العابرة.
  pingInterval: 20000,
  pingTimeout: 20000,
});

const broadcaster = createBroadcaster(io);

// ---------- فحص السلامة (لمراقبة جهوزية المنصة المستضيفة) ----------
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'unreachable', error: err.message });
  }
});

// =====================================================================
// نقاط CRUD — إدارة بيانات المنشآت وسيارات الإسعاف
// "الموارد الطبية (مشافي، مستوصفات، نقاط ميدانية) وسيارات الإسعاف
//  قواعد بيانات يدخلها المدير" — هذه الواجهة الخلفية لذلك.
// كل تعديل يُبثّ فوراً لكل اللوحات المتصلة كي تبقى متزامنة.
// =====================================================================

// ---------- إنشاء منشأة ----------
app.post('/api/facilities', async (req, res) => {
  const { name, type, governorate_id, lon, lat, total_beds, occupied_beds } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO facilities (name, type, governorate_id, location, total_beds, occupied_beds)
       VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6, $7)
       RETURNING id`,
      [name, type, governorate_id || null, lon, lat, total_beds || 0, occupied_beds || 0]
    );
    broadcaster.emitImmediate('data:changed', { entity: 'facilities' });
    res.json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error('[facilities:create]', err.message);
    res.status(400).json({ error: 'تعذّر إنشاء المنشأة', detail: err.message });
  }
});

// ---------- تعديل منشأة ----------
app.put('/api/facilities/:id', async (req, res) => {
  const { id } = req.params;
  const { name, type, governorate_id, lon, lat, total_beds, occupied_beds } = req.body;
  try {
    await pool.query(
      `UPDATE facilities
         SET name = $1, type = $2, governorate_id = $3,
             location = ST_SetSRID(ST_MakePoint($4, $5), 4326),
             total_beds = $6, occupied_beds = $7, updated_at = now()
       WHERE id = $8`,
      [name, type, governorate_id || null, lon, lat, total_beds, occupied_beds, id]
    );
    broadcaster.emitImmediate('data:changed', { entity: 'facilities' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[facilities:update]', err.message);
    res.status(400).json({ error: 'تعذّر تعديل المنشأة', detail: err.message });
  }
});

// ---------- حذف منشأة ----------
app.delete('/api/facilities/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM facilities WHERE id = $1`, [req.params.id]);
    broadcaster.emitImmediate('data:changed', { entity: 'facilities' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[facilities:delete]', err.message);
    res.status(400).json({ error: 'تعذّر حذف المنشأة', detail: err.message });
  }
});

// ---------- إنشاء سيارة إسعاف ----------
app.post('/api/ambulances', async (req, res) => {
  const { call_sign, governorate_id, lon, lat, status } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO ambulances (call_sign, governorate_id, location, status)
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5)
       RETURNING id`,
      [call_sign, governorate_id || null, lon, lat, status || 'AVAILABLE']
    );
    broadcaster.emitImmediate('data:changed', { entity: 'ambulances' });
    res.json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error('[ambulances:create]', err.message);
    res.status(400).json({ error: 'تعذّر إنشاء سيارة الإسعاف', detail: err.message });
  }
});

// ---------- تعديل سيارة إسعاف ----------
app.put('/api/ambulances/:id', async (req, res) => {
  const { id } = req.params;
  const { call_sign, governorate_id, lon, lat, status } = req.body;
  try {
    await pool.query(
      `UPDATE ambulances
         SET call_sign = $1, governorate_id = $2,
             location = ST_SetSRID(ST_MakePoint($3, $4), 4326),
             status = $5, updated_at = now()
       WHERE id = $6`,
      [call_sign, governorate_id || null, lon, lat, status, id]
    );
    broadcaster.emitImmediate('data:changed', { entity: 'ambulances' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[ambulances:update]', err.message);
    res.status(400).json({ error: 'تعذّر تعديل سيارة الإسعاف', detail: err.message });
  }
});

// ---------- حذف سيارة إسعاف ----------
app.delete('/api/ambulances/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM ambulances WHERE id = $1`, [req.params.id]);
    broadcaster.emitImmediate('data:changed', { entity: 'ambulances' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[ambulances:delete]', err.message);
    res.status(400).json({ error: 'تعذّر حذف سيارة الإسعاف', detail: err.message });
  }
});

// ---------- التوجيه اليدوي ----------
// "واجهة تتيح للمدير اتخاذ قرارات يدوية" — يتجاوز المدير الدورة
// التلقائية ويوجّه سيارة محددة (أو الأقرب) إلى منشأة مباشرة.
app.post('/api/dispatch/manual', async (req, res) => {
  const { facilityId, ambulanceId } = req.body;
  try {
    const { rows: facilityRows } = await pool.query(
      `SELECT id, ST_X(location) AS lon, ST_Y(location) AS lat FROM facilities WHERE id = $1`,
      [facilityId]
    );
    if (!facilityRows[0]) return res.status(404).json({ error: 'المنشأة غير موجودة' });

    let ambulance;
    if (ambulanceId) {
      const { rows } = await pool.query(
        `SELECT id, call_sign, 0 AS distance_meters FROM ambulances WHERE id = $1 AND status = 'AVAILABLE'`,
        [ambulanceId]
      );
      ambulance = rows[0];
      if (!ambulance) return res.status(409).json({ error: 'السيارة غير متاحة' });
    } else {
      const facilityWKT = `POINT(${facilityRows[0].lon} ${facilityRows[0].lat})`;
      ambulance = await findNearestAmbulance(facilityWKT);
      if (!ambulance) return res.status(409).json({ error: 'لا توجد سيارة إسعاف متاحة' });
    }

    const dispatch = await assignRouteAndDispatch(ambulance, facilityId);

    await pool.query(
      `INSERT INTO alerts (facility_id, ambulance_id, kind, message) VALUES ($1, $2, 'MANUAL_DISPATCH', $3)`,
      [facilityId, ambulance.id, `توجيه يدوي: ${ambulance.call_sign} ← المنشأة #${facilityId}`]
    );

    broadcaster.emitImmediate('dispatch:manual', dispatch);
    res.json({ ok: true, dispatch });
  } catch (err) {
    console.error('[dispatch] failed', err.message);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

// ---------- دورة حياة اتصال Socket ----------
io.on('connection', (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);
  socket.on('disconnect', (reason) => {
    console.log(`[socket] client disconnected: ${socket.id} (${reason})`);
  });
  // دفاعي: لا تدع معالج حدث واحد يُسقط العملية.
  socket.on('error', (err) => {
    console.error(`[socket] error on ${socket.id}`, err.message);
  });
});

// ---------- شبكات أمان على مستوى العملية ----------
process.on('unhandledRejection', (err) => {
  console.error('[process] unhandled rejection', err);
});
process.on('uncaughtException', (err) => {
  console.error('[process] uncaught exception', err);
});

// ---------- بدء حلقة المحاكاة، تغذّي البثّ المُقيّد ----------
startSimulation((routingResults) => {
  routingResults.forEach((result) => broadcaster.queueFacilityUpdate(result));
}, broadcaster);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`[server] realtime server listening on :${PORT}`);
});
