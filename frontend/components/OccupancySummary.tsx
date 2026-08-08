'use client';

import { useDashboardStore } from '@/lib/store';

export function OccupancySummary() {
  const facilities = useDashboardStore((s) => s.facilities);

  const total = facilities.reduce((sum, f) => sum + f.total_beds, 0);
  const occupied = facilities.reduce((sum, f) => sum + f.occupied_beds, 0);
  const critical = facilities.filter((f) => f.status === 'RED').length;
  const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;

  return (
    <section
      className="boot-4"
      style={{
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        background: 'var(--panel)',
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <h2 style={{ fontSize: 13, fontWeight: 700 }}>ملخص الإشغال</h2>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="data-mono" style={{ fontSize: 26, fontWeight: 600, color: pct > 80 ? 'var(--status-red)' : 'var(--status-green)' }}>
          {pct}%
        </span>
        <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>إشغال عام</span>
      </div>

      <div style={{ height: 4, background: 'var(--line)', borderRadius: 2, overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: pct > 80 ? 'var(--status-red)' : 'var(--status-green)',
            transition: 'width 0.6s ease',
          }}
        />
      </div>

      <div className="data-mono" style={{ fontSize: 11, color: 'var(--ink-dim)', display: 'flex', justifyContent: 'space-between' }}>
        <span>{occupied}/{total} سرير</span>
        <span style={{ color: critical > 0 ? 'var(--status-red)' : 'var(--ink-dim)' }}>
          {critical} منشأة حرجة
        </span>
      </div>
    </section>
  );
}
