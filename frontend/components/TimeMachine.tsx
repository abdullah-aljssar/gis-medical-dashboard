'use client';

import { useState } from 'react';
import { useDashboardStore, Facility, Ambulance } from '@/lib/store';

export function TimeMachine() {
  const timeMachine = useDashboardStore((s) => s.timeMachine);
  const setTimeMachine = useDashboardStore((s) => s.setTimeMachine);
  const setFacilities = useDashboardStore((s) => s.setFacilities);
  const setAmbulances = useDashboardStore((s) => s.setAmbulances);

  const [pendingDate, setPendingDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSnapshot(isoDate: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/history?at=${encodeURIComponent(isoDate)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الطلب');

      setFacilities(
        data.snapshot.facilities_json.map((f: Facility) => ({ ...f }))
      );
      setAmbulances(data.snapshot.ambulances_json);
      setTimeMachine({ active: true, timestamp: data.snapshot.captured_at });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ غير معروف');
    } finally {
      setLoading(false);
    }
  }

  function returnToLive() {
    setTimeMachine({ active: false, timestamp: null });
    // The socket listener keeps pushing live updates regardless; this just
    // re-fetches the current state to snap back in sync immediately.
    fetch('/api/facilities').then((r) => r.json()).then((d) => setFacilities(d.facilities));
    fetch('/api/ambulances').then((r) => r.json()).then((d) => setAmbulances(d.ambulances));
  }

  return (
    <footer
      className="boot-4 data-mono"
      style={{
        borderTop: '1px solid var(--line)',
        background: 'var(--panel)',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        fontSize: 12,
      }}
    >
      <span style={{ color: 'var(--ink-dim)', whiteSpace: 'nowrap' }}>
        ⏱ الآلة الزمنية
      </span>

      <input
        type="datetime-local"
        value={pendingDate}
        onChange={(e) => setPendingDate(e.target.value)}
        style={{
          background: 'var(--void)',
          color: 'var(--ink)',
          border: '1px solid var(--line-bright)',
          borderRadius: 'var(--radius)',
          padding: '4px 8px',
          fontFamily: 'var(--font-data)',
          fontSize: 12,
        }}
      />

      <button
        onClick={() => pendingDate && loadSnapshot(new Date(pendingDate).toISOString())}
        disabled={!pendingDate || loading}
        style={{
          background: 'transparent',
          border: '1px solid var(--accent)',
          color: 'var(--accent)',
          borderRadius: 'var(--radius)',
          padding: '4px 12px',
          cursor: 'pointer',
          fontFamily: 'var(--font-data)',
          fontSize: 12,
        }}
      >
        {loading ? 'جارٍ التحميل...' : 'استرجاع'}
      </button>

      {/* Tape-reel indicator: a bar of ticks that fills like reel progress
          rather than a plain browser range input — the scrubber's visual
          signature. */}
      <div style={{ flex: 1, display: 'flex', gap: 2, alignItems: 'center', height: 16 }}>
        {Array.from({ length: 48 }).map((_, i) => (
          <span
            key={i}
            style={{
              flex: 1,
              height: timeMachine.active ? 10 : 6,
              background: timeMachine.active ? 'var(--accent)' : 'var(--line-bright)',
              opacity: timeMachine.active ? (i % 6 === 0 ? 1 : 0.4) : 0.5,
              transition: 'height 0.3s ease',
            }}
          />
        ))}
      </div>

      {timeMachine.active ? (
        <>
          <span style={{ color: 'var(--status-amber)' }}>
            عرض سجل: {timeMachine.timestamp && new Date(timeMachine.timestamp).toLocaleString('ar-SY')}
          </span>
          <button
            onClick={returnToLive}
            style={{
              background: 'var(--status-green)',
              border: 'none',
              color: 'var(--void)',
              borderRadius: 'var(--radius)',
              padding: '4px 12px',
              cursor: 'pointer',
              fontFamily: 'var(--font-data)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            ▶ العودة للبث الحي
          </button>
        </>
      ) : (
        <span style={{ color: 'var(--status-green)' }}>● بث حي</span>
      )}

      {error && <span style={{ color: 'var(--status-red)' }}>{error}</span>}
    </footer>
  );
}
