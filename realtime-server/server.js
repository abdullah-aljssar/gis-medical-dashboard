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
  // Tuned for dashboards left open for a full shift: detect a dead
  // connection without being trigger-happy about brief network hiccups.
  pingInterval: 20000,
  pingTimeout: 20000,
});

const broadcaster = createBroadcaster(io);

// ---------- Health check (for the hosting platform's uptime monitor) ----------
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'unreachable', error: err.message });
  }
});

// ---------- Manual dispatch endpoint ----------
// "واجهة تتيح للمدير اتخاذ قرارات يدوية" — a manager can override the
// automatic cycle and dispatch a specific ambulance to a facility directly.
app.post('/api/dispatch/manual', async (req, res) => {
  const { facilityId, ambulanceId } = req.body;
  try {
    const { rows: facilityRows } = await pool.query(
      `SELECT id, ST_X(location) AS lon, ST_Y(location) AS lat FROM facilities WHERE id = $1`,
      [facilityId]
    );
    if (!facilityRows[0]) return res.status(404).json({ error: 'facility not found' });

    let ambulance;
    if (ambulanceId) {
      const { rows } = await pool.query(
        `SELECT id, call_sign, 0 AS distance_meters FROM ambulances WHERE id = $1 AND status = 'AVAILABLE'`,
        [ambulanceId]
      );
      ambulance = rows[0];
      if (!ambulance) return res.status(409).json({ error: 'ambulance not available' });
    } else {
      const facilityWKT = `POINT(${facilityRows[0].lon} ${facilityRows[0].lat})`;
      ambulance = await findNearestAmbulance(facilityWKT);
      if (!ambulance) return res.status(409).json({ error: 'no available ambulance' });
    }

    const dispatch = await assignRouteAndDispatch(ambulance, facilityId);

    await pool.query(
      `INSERT INTO alerts (facility_id, ambulance_id, kind, message) VALUES ($1, $2, 'MANUAL_DISPATCH', $3)`,
      [facilityId, ambulance.id, `توجيه يدوي: ${ambulance.call_sign} → المنشأة #${facilityId}`]
    );

    broadcaster.emitImmediate('dispatch:manual', dispatch);
    res.json({ ok: true, dispatch });
  } catch (err) {
    console.error('[dispatch] failed', err.message);
    res.status(500).json({ error: 'internal error' });
  }
});

// ---------- Socket connection lifecycle ----------
io.on('connection', (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`[socket] client disconnected: ${socket.id} (${reason})`);
  });

  // Defensive: never let one bad event handler crash the server process.
  socket.on('error', (err) => {
    console.error(`[socket] error on ${socket.id}`, err.message);
  });
});

// ---------- Process-level safety nets ----------
// A single unexpected rejection anywhere in the simulation loop must not
// take down a dashboard the entire shift depends on.
process.on('unhandledRejection', (err) => {
  console.error('[process] unhandled rejection', err);
});
process.on('uncaughtException', (err) => {
  console.error('[process] uncaught exception', err);
});

// ---------- Start the simulation loop, feeding the throttled broadcaster ----------
startSimulation((routingResults) => {
  routingResults.forEach((result) => broadcaster.queueFacilityUpdate(result));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`[server] realtime server listening on :${PORT}`);
});
