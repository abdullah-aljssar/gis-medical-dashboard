// ============================================================
// Literal translation of routing_algorithm_diagram.png
// No personal interpretation of the math or thresholds — this
// mirrors the flowchart box-for-box:
//
//   Calculate: Available Beds = Total - Occupied
//        │
//   Occupancy > 90% ?
//     YES → Set Status: RED, Trigger Alert
//           → Find Nearest Ambulance (PostGIS ST_Distance)
//     NO  → Set Status: GREEN
//        │
//   Assign Route & Dispatch
//        │
//   (loop back to Calculate)
// ============================================================
const { pool } = require('../db/pool');

const OCCUPANCY_ALERT_THRESHOLD = 90; // as specified in the flowchart, not adjustable per-facility

/**
 * Step 1 — Calculate: Available Beds = Total - Occupied
 */
function calculateAvailableBeds(totalBeds, occupiedBeds) {
  return totalBeds - occupiedBeds;
}

function calculateOccupancyPct(totalBeds, occupiedBeds) {
  if (totalBeds === 0) return 0;
  return (occupiedBeds / totalBeds) * 100;
}

/**
 * Step 2 — "Find Nearest Ambulance using PostGIS ST_Distance()"
 * Uses the <-> KNN operator (backed by the GiST index on `location`) to
 * shortlist candidates cheaply, then ST_Distance(...::geography) to return
 * an exact great-circle distance in meters, exactly as the box names it.
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
  return rows[0] || null; // null if no ambulance is currently AVAILABLE
}

/**
 * Step 3 — "Assign Route & Dispatch"
 * Only meaningful when an ambulance was found (RED branch). On the GREEN
 * branch the diagram still flows through this box, but with nothing to
 * route — so it's a pass-through, not a fabricated dispatch.
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
 * Full cycle for one facility — mirrors the whole diagram for a single
 * "tick". Called by the simulation loop for every facility on every tick.
 */
async function runRoutingCycle(facility) {
  const availableBeds = calculateAvailableBeds(facility.total_beds, facility.occupied_beds);
  const occupancyPct = calculateOccupancyPct(facility.total_beds, facility.occupied_beds);

  let status;
  let dispatch = null;
  let alertTriggered = false;

  if (occupancyPct > OCCUPANCY_ALERT_THRESHOLD) {
    // YES branch
    status = 'RED';
    alertTriggered = true;

    const facilityLocationWKT = `POINT(${facility.lon} ${facility.lat})`;
    const nearestAmbulance = await findNearestAmbulance(facilityLocationWKT);
    dispatch = await assignRouteAndDispatch(nearestAmbulance, facility.id);
  } else {
    // NO branch
    status = 'GREEN';
    // Assign Route & Dispatch box — pass-through, nothing to dispatch.
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
