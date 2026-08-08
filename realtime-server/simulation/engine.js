// ============================================================
// محرّك المحاكاة — سكريبت برمجي متقدم قائم على قواعد حتمية
// المطوّر: عبدالله زايد الجسار
//
// يولّد سيناريوهات الطوارئ وحركة سيارات الإسعاف عبر قواعد ثابتة:
// احتمالات محددة، مشي عشوائي محدود المدى، ومنطق مخطط routing.js.
// نفس المدخلات تنتج نفس صنف السلوك — قابل لإعادة الإنتاج والتدقيق
// بالكامل، وخفيف بما يكفي للعمل ضمن قيود شبكة محدودة.
// ============================================================
const { pool } = require('../db/pool');
const { runRoutingCycle } = require('./routing');

const TICK_INTERVAL_MS = 6_000;       // معدّل تقدّم المحاكاة (كل 6 ثوانٍ)
const SNAPSHOT_INTERVAL_TICKS = 10;   // لقطة زمنية كل 10 نبضات (~كل دقيقة)
const BED_CHANGE_PROBABILITY = 0.5;   // احتمال تغيّر إشغال منشأة في النبضة
const AMBULANCE_DRIFT_DEGREES = 0.012;// خطوة صغيرة لتحريك مؤشرات الإسعاف
const EMERGENCY_CALL_PROBABILITY = 0.15; // احتمال بلاغ طارئ عشوائي في النبضة

let tickCount = 0;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * يُزحزح عدد الأسرّة المشغولة لكل منشأة صعوداً أو نزولاً بمقدار
 * محدود، مع احتمال ثابت لـ"لا تغيير" — مشي عشوائي موزون، لا
 * تنبؤ نموذج.
 */
async function driftFacilityOccupancy() {
  const { rows: facilities } = await pool.query(
    `SELECT id, total_beds, occupied_beds, ST_X(location) AS lon, ST_Y(location) AS lat
     FROM facilities`
  );

  const results = [];
  for (const facility of facilities) {
    if (Math.random() < BED_CHANGE_PROBABILITY) {
      const delta = randomInt(-4, 5); // انحياز خفيف للأعلى ليعبر عتبة RED أحياناً
      let newOccupied = facility.occupied_beds + delta;
      newOccupied = Math.max(0, Math.min(facility.total_beds, newOccupied));

      await pool.query(`UPDATE facilities SET occupied_beds = $1 WHERE id = $2`, [
        newOccupied,
        facility.id,
      ]);
      facility.occupied_beds = newOccupied;
    }

    // routing.js يملك قرار الحالة/التوجيه الفعلي — المحرّك يزحزح
    // أعداد الأسرّة الخام فقط.
    const cycleResult = await runRoutingCycle(facility);
    results.push(cycleResult);
  }
  return results;
}

/**
 * يحرّك سيارات EN_ROUTE خطوة صغيرة نحو منشأتها المعيّنة، ويحرّر
 * أحياناً سيارة AT_SCENE لتعود متاحة. حساب إحداثيات صرف — بلا
 * استدعاءات خارجية.
 */
async function driftAmbulances() {
  const { rows: ambulances } = await pool.query(
    `SELECT a.id, a.status, a.assigned_facility_id,
            ST_X(a.location) AS lon, ST_Y(a.location) AS lat,
            ST_X(f.location) AS f_lon, ST_Y(f.location) AS f_lat
     FROM ambulances a
     LEFT JOIN facilities f ON f.id = a.assigned_facility_id`
  );

  for (const amb of ambulances) {
    if (amb.status === 'EN_ROUTE' && amb.f_lon != null) {
      const dLon = amb.f_lon - amb.lon;
      const dLat = amb.f_lat - amb.lat;
      const dist = Math.sqrt(dLon * dLon + dLat * dLat);

      if (dist < AMBULANCE_DRIFT_DEGREES) {
        // وصلت
        await pool.query(
          `UPDATE ambulances SET status = 'AT_SCENE', location = ST_SetSRID(ST_MakePoint($1,$2),4326), updated_at = now() WHERE id = $3`,
          [amb.f_lon, amb.f_lat, amb.id]
        );
      } else {
        const stepLon = amb.lon + (dLon / dist) * AMBULANCE_DRIFT_DEGREES;
        const stepLat = amb.lat + (dLat / dist) * AMBULANCE_DRIFT_DEGREES;
        await pool.query(
          `UPDATE ambulances SET location = ST_SetSRID(ST_MakePoint($1,$2),4326), updated_at = now() WHERE id = $3`,
          [stepLon, stepLat, amb.id]
        );
      }
    } else if (amb.status === 'AT_SCENE' && Math.random() < 0.4) {
      // تعود متاحة بعد مكوث محدود
      await pool.query(
        `UPDATE ambulances SET status = 'AVAILABLE', assigned_facility_id = NULL, updated_at = now() WHERE id = $1`,
        [amb.id]
      );
    }
  }
}

/**
 * يولّد أحياناً بلاغ طوارئ عشوائياً عند منشأة، ويسجّله في جدول
 * التنبيهات — سيناريو توليدي بقاعدة احتمالية ثابتة.
 */
async function maybeGenerateEmergencyCall(broadcaster) {
  if (Math.random() >= EMERGENCY_CALL_PROBABILITY) return;

  const { rows } = await pool.query(
    `SELECT id, name FROM facilities ORDER BY random() LIMIT 1`
  );
  if (!rows[0]) return;

  const facility = rows[0];
  const message = `بلاغ طارئ وارد قرب ${facility.name}`;
  const { rows: inserted } = await pool.query(
    `INSERT INTO alerts (facility_id, kind, message) VALUES ($1, 'EMERGENCY_CALL', $2) RETURNING created_at`,
    [facility.id, message]
  );

  if (broadcaster) {
    broadcaster.emitImmediate('alerts:new', [
      {
        facilityId: facility.id,
        kind: 'EMERGENCY_CALL',
        message,
        createdAt: inserted[0].created_at,
      },
    ]);
  }
}

async function takeSnapshot() {
  const { rows: facilities } = await pool.query(`SELECT * FROM facility_occupancy`);
  const { rows: ambulances } = await pool.query(`SELECT * FROM ambulances`);
  await pool.query(
    `INSERT INTO state_snapshots (facilities_json, ambulances_json) VALUES ($1, $2)`,
    [JSON.stringify(facilities), JSON.stringify(ambulances)]
  );
}

/**
 * نبضة محاكاة كاملة. تعيد نتائج التوجيه ليبثّ المستدعي (server.js)
 * ما تغيّر فقط.
 */
async function tick(broadcaster) {
  tickCount += 1;
  const routingResults = await driftFacilityOccupancy();
  await driftAmbulances();
  await maybeGenerateEmergencyCall(broadcaster);

  if (tickCount % SNAPSHOT_INTERVAL_TICKS === 0) {
    await takeSnapshot();
  }

  return routingResults;
}

function startSimulation(onTick, broadcaster) {
  return setInterval(async () => {
    try {
      const results = await tick(broadcaster);
      onTick(results);
    } catch (err) {
      // نبضة فاشلة يجب ألّا تقتل المؤقّت — سجّل وأعد المحاولة.
      console.error('[simulation] tick failed', err.message);
    }
  }, TICK_INTERVAL_MS);
}

module.exports = { startSimulation, tick, TICK_INTERVAL_MS };
