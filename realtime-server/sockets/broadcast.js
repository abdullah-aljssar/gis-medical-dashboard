// ============================================================
// Throttled broadcast — buffers updates and flushes at most once
// per BROADCAST_INTERVAL_MS. Without this, a tick that changes 15
// facilities at once would fire 15 separate `emit` calls and hammer
// every connected dashboard; here they collapse into one payload.
// ============================================================
const BROADCAST_INTERVAL_MS = 1000;

function createBroadcaster(io) {
  let pendingFacilityUpdates = new Map(); // facilityId -> latest result
  let pendingAlerts = [];

  const flush = () => {
    if (pendingFacilityUpdates.size > 0) {
      io.emit('facilities:update', Array.from(pendingFacilityUpdates.values()));
      pendingFacilityUpdates = new Map();
    }
    if (pendingAlerts.length > 0) {
      io.emit('alerts:new', pendingAlerts);
      pendingAlerts = [];
    }
  };

  setInterval(flush, BROADCAST_INTERVAL_MS);

  return {
    queueFacilityUpdate(result) {
      pendingFacilityUpdates.set(result.facilityId, result);
      if (result.alertTriggered) {
        pendingAlerts.push({
          facilityId: result.facilityId,
          kind: 'OCCUPANCY_CRITICAL',
          message: `تجاوزت نسبة الإشغال 90% — تم إرسال أقرب سيارة إسعاف`,
          dispatch: result.dispatch,
          createdAt: new Date().toISOString(),
        });
      }
    },
    // For low-frequency, high-importance events (manual dispatch, direct
    // emergency calls) we bypass the buffer and emit immediately —
    // throttling is for volume, not for urgency.
    emitImmediate(event, payload) {
      io.emit(event, payload);
    },
  };
}

module.exports = { createBroadcaster, BROADCAST_INTERVAL_MS };
