// ============================================================
// خوارزمية التوجيه — ترجمة حرفية للمخطط البياني
// (routing_algorithm_diagram.png)
// المطوّر: عبدالله زايد الجسار
//
// لا اجتهاد شخصي في الرياضيات أو العتبات — هذا الكود يعكس
// المخطط صندوقاً بصندوق:
//
//   احسب: الأسرّة المتاحة = الإجمالي - المشغولة
//        │
//   الإشغال > 90% ؟
//     نعم → الحالة: RED، إطلاق تنبيه
//           → إيجاد أقرب إسعاف (PostGIS ST_Distance)
//     لا  → الحالة: GREEN
//        │
//   تعيين المسار والتوجيه
//        │
//   (العودة للحساب من جديد)
// ============================================================
const { pool } = require('../db/pool');

const OCCUPANCY_ALERT_THRESHOLD = 90; // كما في المخطط، غير قابل للتعديل لكل منشأة

// الخطوة 1 — احسب: الأسرّة المتاحة = الإجمالي - المشغولة
function calculateAvailableBeds(totalBeds, occupiedBeds) {
  return totalBeds - occupiedBeds;
}

function calculateOccupancyPct(totalBeds, occupiedBeds) {
  if (totalBeds === 0) return 0;
  return (occupiedBeds / totalBeds) * 100;
}

/**
 * الخطوة 2 — "إيجاد أقرب إسعاف باستخدام PostGIS ST_Distance()"
 * عامل KNN (<->) المدعوم بفهرس GiST على العمود location يرشّح
 * المرشحين بتكلفة زهيدة، ثم ST_Distance على النوع geography يعيد
 * مسافة دائرة عظمى دقيقة بالأمتار، تماماً كما يسمّيه صندوق المخطط.
 */
async function findNearestAmbulance(facilityLocationWKT) {
  const { rows } = await pool.query(
    `SELECT
        id,
        call_sign,
        ST_Distance(location::geography, ST_GeomFromText($1, 4326)::geography) AS distance_meters
     FROM ambulances
     WHERE status = 'AVAILABLE'
     ORDER BY location <-> ST_GeomFromText($1, 4326)
     LIMIT 1`,
    [facilityLocationWKT]
  );
  return rows[0] || null; // null إن لم تتوفر سيارة متاحة حالياً
}

/**
 * الخطوة 3 — "تعيين المسار والتوجيه"
 * ذات معنى فقط عند إيجاد سيارة (فرع RED). في فرع GREEN يمرّ
 * المخطط عبر هذا الصندوق أيضاً لكن دون ما يُوجَّه — فيكون تمريراً
 * لا توجيهاً مُصطنعاً.
 */
async function assignRouteAndDispatch(ambulance, facilityId) {
  if (!ambulance) return null;

  await pool.query(
    `UPDATE ambulances SET status = 'EN_ROUTE', assigned_facility_id = $1, updated_at = now() WHERE id = $2`,
    [facilityId, ambulance.id]
  );

  return {
    ambulanceId: ambulance.id,
    callSign: ambulance.call_sign,
    facilityId,
    distanceMeters: Math.round(ambulance.distance_meters),
  };
}

/**
 * الدورة الكاملة لمنشأة واحدة — تعكس المخطط بأكمله لكل "نبضة"
 * (tick). يستدعيها محرّك المحاكاة لكل منشأة في كل نبضة.
 */
async function runRoutingCycle(facility) {
  const availableBeds = calculateAvailableBeds(facility.total_beds, facility.occupied_beds);
  const occupancyPct = calculateOccupancyPct(facility.total_beds, facility.occupied_beds);

  let status;
  let dispatch = null;
  let alertTriggered = false;

  if (occupancyPct > OCCUPANCY_ALERT_THRESHOLD) {
    // فرع "نعم"
    status = 'RED';
    alertTriggered = true;

    const facilityLocationWKT = `POINT(${facility.lon} ${facility.lat})`;
    const nearestAmbulance = await findNearestAmbulance(facilityLocationWKT);
    dispatch = await assignRouteAndDispatch(nearestAmbulance, facility.id);
  } else {
    // فرع "لا"
    status = 'GREEN';
    // صندوق تعيين المسار — تمرير، لا شيء للتوجيه.
  }

  await pool.query(
    `UPDATE facilities SET status = $1, updated_at = now() WHERE id = $2`,
    [status, facility.id]
  );

  return { facilityId: facility.id, availableBeds, occupancyPct, status, alertTriggered, dispatch };
}

module.exports = {
  OCCUPANCY_ALERT_THRESHOLD,
  calculateAvailableBeds,
  calculateOccupancyPct,
  findNearestAmbulance,
  assignRouteAndDispatch,
  runRoutingCycle,
};
