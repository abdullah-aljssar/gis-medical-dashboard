'use client';

import { useDashboardStore } from '@/lib/store';

export function Header() {
  const connectionStatus = useDashboardStore((s) => s.connectionStatus);

  const statusLabel = {
    live: 'متصل — بث حي',
    connecting: 'جارٍ الاتصال...',
    offline: 'غير متصل — إعادة المحاولة...',
  }[connectionStatus];

  const statusColor = {
    live: 'var(--status-green)',
    connecting: 'var(--status-amber)',
    offline: 'var(--status-red)',
  }[connectionStatus];

  return (
    <header
      className="boot-1"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--panel)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h1 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.01em' }}>
          مرصد الموارد الطبية
        </h1>
        <span className="data-mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
          SYR / GIS-MED-01
        </span>
      </div>

      <div
        className="data-mono"
        style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: statusColor }}
      >
        <span
          className="live-dot"
          style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor }}
        />
        {statusLabel}
      </div>
    </header>
  );
}
