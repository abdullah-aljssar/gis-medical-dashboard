'use client';

import { useState } from 'react';
import { useDashboardStore } from '@/lib/store';

export function CriticalFacilitiesList() {
  const facilities = useDashboardStore((s) => s.facilities);
  const [dispatching, setDispatching] = useState<number | null>(null);

  const critical = facilities.filter((f) => f.status === 'RED').sort((a, b) => b.occupancy_pct - a.occupancy_pct);

  async function dispatchNow(facilityId: number) {
    setDispatching(facilityId);
    try {
      await fetch(`${process.env.REALTIME_SERVER_URL}/api/dispatch/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facilityId }),
      });
      // The confirmation/alert itself arrives over the socket
      // (dispatch:manual event) rather than from this response —
      // keeps every client's view consistent, not just the caller's.
    } catch {
      // Network hiccup — the manager can simply press dispatch again;
      // no partial state to reconcile since the server owns truth.
    } finally {
      setDispatching(null);
    }
  }

  return (
    <section
      className="boot-3"
      style={{
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        background: 'var(--panel)',
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <h2 style={{ fontSize: 13, fontWeight: 700 }}>قرار يدوي — منشآت حرجة</h2>
      {critical.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--ink-faint)' }}>لا توجد منشآت حرجة حالياً.</p>
      )}
      {critical.map((f) => (
        <div
          key={f.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '6px 0',
            borderTop: '1px solid var(--line)',
          }}
        >
          <div style={{ fontSize: 12 }}>
            <div>{f.name}</div>
            <div className="data-mono" style={{ color: 'var(--status-red)', fontSize: 11 }}>
              {f.occupancy_pct}% إشغال
            </div>
          </div>
          <button
            onClick={() => dispatchNow(f.id)}
            disabled={dispatching === f.id}
            style={{
              background: 'transparent',
              border: '1px solid var(--status-red)',
              color: 'var(--status-red)',
              borderRadius: 'var(--radius)',
              padding: '4px 10px',
              fontSize: 11,
              fontFamily: 'var(--font-data)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {dispatching === f.id ? '...' : 'توجيه إسعاف'}
          </button>
        </div>
      ))}
    </section>
  );
}
