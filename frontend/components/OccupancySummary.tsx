// المطوّر: عبدالله زايد الجسار
'use client';

import { useEffect, useState } from 'react';
import { useDashboardStore } from '@/lib/store';

interface Stats {
  totals: {
    facility_count: number;
    critical_count: number;
    total_beds: number;
    occupied_beds: number;
    available_beds: number;
  };
  ambulances: { total: number; available: number; en_route: number };
  byGovernorate: {
    id: number;
    name_ar: string;
    facility_count: number;
    critical_count: number;
    avg_occupancy_pct: number;
  }[];
}

export function OccupancySummary() {
  const facilities = useDashboardStore((s) => s.facilities);
  const dataVersion = useDashboardStore((s) => s.dataVersion);
  const [stats, setStats] = useState<Stats | null>(null);

  // يُعاد الحساب مع كل نبضة بث (تغيّر المنشآت) ومع تغيّر البيانات.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && !d.error) setStats(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, facilities.length]);

  const occPct =
    stats && Number(stats.totals.total_beds) > 0
      ? Math.round((Number(stats.totals.occupied_beds) / Number(stats.totals.total_beds)) * 100)
      : 0;

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
        gap: 12,
      }}
    >
      <h2 style={{ fontSize: 13, fontWeight: 700 }}>ملخّص الإشغال</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Kpi label="إجمالي المنشآت" value={stats?.totals.facility_count ?? '—'} />
        <Kpi
          label="منشآت حرجة"
          value={stats?.totals.critical_count ?? '—'}
          color="var(--status-red)"
        />
        <Kpi label="أسرّة متاحة" value={stats?.totals.available_beds ?? '—'} color="var(--status-green)" />
        <Kpi label="متوسط الإشغال" value={`${occPct}%`} />
        <Kpi label="إسعاف متاح" value={stats?.ambulances.available ?? '—'} color="var(--accent)" />
        <Kpi
          label="إسعاف في الطريق"
          value={stats?.ambulances.en_route ?? '—'}
          color="var(--status-amber)"
        />
      </div>

      {stats && stats.byGovernorate.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-dim)', marginBottom: 2 }}>
            الإشغال حسب المحافظة
          </div>
          {stats.byGovernorate.slice(0, 6).map((g) => (
            <div
              key={g.id}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}
            >
              <span style={{ width: 64, color: 'var(--ink-dim)' }}>{g.name_ar}</span>
              <div style={{ flex: 1, height: 6, background: 'var(--void)', borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, g.avg_occupancy_pct)}%`,
                    height: '100%',
                    background:
                      g.avg_occupancy_pct > 90
                        ? 'var(--status-red)'
                        : g.avg_occupancy_pct > 75
                        ? 'var(--status-amber)'
                        : 'var(--status-green)',
                  }}
                />
              </div>
              <span className="data-mono" style={{ width: 38, textAlign: 'left', color: 'var(--ink-dim)' }}>
                {g.avg_occupancy_pct}%
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Kpi({
  label,
  value,
  color = 'var(--ink)',
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        padding: '8px 10px',
        background: 'var(--void)',
      }}
    >
      <div className="data-mono" style={{ fontSize: 20, fontWeight: 600, color }}>
        {value}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-dim)', marginTop: 2 }}>{label}</div>
    </div>
  );
}
