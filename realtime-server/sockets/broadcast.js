// ============================================================
// البث المُقيّد (Throttled Broadcast)
// المطوّر: عبدالله زايد الجسار
//
// يخزّن التحديثات مؤقتاً ويبثّها مرة واحدة كل BROADCAST_INTERVAL_MS
// على الأكثر. بدونه، نبضة تغيّر 15 منشأة دفعة واحدة كانت ستطلق 15
// أمر emit منفصلاً وتُغرق كل لوحة متصلة؛ هنا تتجمّع في حمولة واحدة.
// ============================================================
const BROADCAST_INTERVAL_MS = 1000;

function createBroadcaster(io) {
  let pendingFacilityUpdates = new Map(); // facilityId -> آخر نتيجة
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
    // للأحداث منخفضة التكرار عالية الأهمية (توجيه يدوي، بلاغ مباشر)
    // نتجاوز المخزّن ونبثّ فوراً — التقييد للحجم لا للإلحاح.
    emitImmediate(event, payload) {
      io.emit(event, payload);
    },
  };
}

module.exports = { createBroadcaster, BROADCAST_INTERVAL_MS };
