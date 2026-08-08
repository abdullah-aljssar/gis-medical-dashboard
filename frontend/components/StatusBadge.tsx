// المطوّر: عبدالله زايد الجسار
'use client';

export function StatusBadge({ status }: { status: 'GREEN' | 'RED' }) {
  const isRed = status === 'RED';
  return (
    <span
      className="data-mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 'var(--radius)',
        border: `1px solid ${isRed ? 'var(--status-red)' : 'var(--status-green)'}`,
        color: isRed ? 'var(--status-red)' : 'var(--status-green)',
        background: isRed ? 'rgba(230,72,58,0.08)' : 'rgba(52,211,153,0.08)',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: isRed ? 'var(--status-red)' : 'var(--status-green)',
        }}
      />
      {isRed ? 'حرجة' : 'طبيعية'}
    </span>
  );
}
