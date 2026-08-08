// المطوّر: عبدالله زايد الجسار
// يتصل بالسيرفر الحي المستقل (وليس وظيفة serverless — انظر README).
// إعادة الاتصال يديرها socket.io-client بتراجع أُسّي؛ نعرض حالة الاتصال
// في الواجهة (متصل / إعادة الاتصال...) بدل الفشل الصامت.
import { io, Socket } from 'socket.io-client';
import { useDashboardStore } from './store';

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket) return socket;

  const url =
    process.env.NEXT_PUBLIC_REALTIME_SERVER_URL || 'http://localhost:4000';

  socket = io(url, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    transports: ['websocket', 'polling'],
  });

  const {
    setConnectionStatus,
    applyFacilityUpdates,
    pushAlerts,
    bumpDataVersion,
  } = useDashboardStore.getState();

  socket.on('connect', () => setConnectionStatus('live'));
  socket.on('disconnect', () => setConnectionStatus('offline'));
  socket.io.on('reconnect_attempt', () => setConnectionStatus('connecting'));

  socket.on('facilities:update', (updates) => applyFacilityUpdates(updates));
  socket.on('alerts:new', (alerts) => pushAlerts(alerts));

  // عند إضافة/تعديل/حذف منشأة أو سيارة عبر واجهة الإدارة، يبثّ السيرفر
  // هذا الحدث لتُعيد كل اللوحات جلب البيانات وتبقى متزامنة.
  socket.on('data:changed', () => bumpDataVersion());

  socket.on('dispatch:manual', (dispatch) => {
    pushAlerts([
      {
        facilityId: dispatch.facilityId,
        kind: 'MANUAL_DISPATCH',
        message: `توجيه يدوي: ${dispatch.callSign}`,
        dispatch,
        createdAt: new Date().toISOString(),
      },
    ]);
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

// رابط السيرفر الحي — تستخدمه الواجهة لطلبات CRUD المباشرة (POST/PUT/DELETE).
export function realtimeServerUrl(): string {
  return process.env.NEXT_PUBLIC_REALTIME_SERVER_URL || 'http://localhost:4000';
}
