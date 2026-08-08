import { io, Socket } from 'socket.io-client';
import { useDashboardStore } from './store';

let socket: Socket | null = null;

/**
 * Connects to the standalone realtime-server (NOT a Vercel function — see
 * ARCHITECTURE.md). Reconnection is handled by socket.io-client itself with
 * exponential backoff; we surface the connection state into the store so
 * the UI can show "متصل / إعادة الاتصال..." instead of failing silently.
 */
export function connectSocket(): Socket {
  if (socket) return socket;

  const url = process.env.REALTIME_SERVER_URL || 'http://localhost:4000';
  socket = io(url, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  const { setConnectionStatus, applyFacilityUpdates, pushAlerts } = useDashboardStore.getState();

  socket.on('connect', () => setConnectionStatus('live'));
  socket.on('disconnect', () => setConnectionStatus('offline'));
  socket.on('reconnect_attempt', () => setConnectionStatus('connecting'));

  socket.on('facilities:update', (updates) => applyFacilityUpdates(updates));
  socket.on('alerts:new', (alerts) => pushAlerts(alerts));
  socket.on('dispatch:manual', (dispatch) => {
    // Manual dispatches don't carry a facility-status change on their own,
    // but we still want a toast-worthy trace in the alert stream.
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
