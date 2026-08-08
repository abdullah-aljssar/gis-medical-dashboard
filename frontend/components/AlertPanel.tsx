'use client';

import { useDashboardStore } from '@/lib/store';

export function AlertPanel() {
  const alerts = useDashboardStore((s) => s.alerts);

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
        gap: 10,
        maxHeight: 260,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-red)' }} className="pulse-red" />
        <h2 style={{ fontSize: 13, fontWeight: 700 }}>تنبيهات فورية</h2>
      </div>

      <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--ink-faint)' }}>لا توجد تنبيهات حالياً — كل المنشآت ضمن الحدود الطبيعية.</p>
        )}
        {alerts.map((a, i) => (
          <div
            key={`${a.facilityId}-${a.createdAt}-${i}`}
            style={{
              borderInlineStart: `2px solid ${a.kind === 'MANUAL_DISPATCH' ? 'var(--accent)' : 'var(--status-red)'}`,
              paddingInlineStart: 10,
              fontSize: 12,
            }}
          >
            <div>{a.message}</div>
            {a.dispatch && (
              <div className="data-mono" style={{ color: 'var(--ink-dim)', fontSize: 11, marginTop: 2 }}>
                {a.dispatch.callSign} · {Math.round((a.dispatch.distanceMeters ?? 0) / 1000)} كم
              </div>
            )}
            <div className="data-mono" style={{ color: 'var(--ink-faint)', fontSize: 10, marginTop: 2 }}>
              {new Date(a.createdAt).toLocaleTimeString('ar-SY')}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
