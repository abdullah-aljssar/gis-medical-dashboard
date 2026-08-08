// المطوّر: عبدالله زايد الجسار
'use client';

import { useDashboardStore } from '@/lib/store';

const TYPE_OPTIONS = [
  { value: '', label: 'كل الأنواع' },
  { value: 'hospital', label: 'مشافي' },
  { value: 'dispensary', label: 'مستوصفات' },
  { value: 'field_point', label: 'نقاط ميدانية' },
];

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--void)',
  border: '1px solid var(--line-bright)',
  color: 'var(--ink)',
  borderRadius: 'var(--radius)',
  padding: '7px 10px',
  fontSize: 12.5,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
};

export function Filters() {
  const filters = useDashboardStore((s) => s.filters);
  const governorates = useDashboardStore((s) => s.governorates);
  const setFilters = useDashboardStore((s) => s.setFilters);

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
      }}
    >
      <h2 style={{ fontSize: 13, fontWeight: 700 }}>فلترة</h2>

      <label style={{ fontSize: 11, color: 'var(--ink-dim)' }}>المحافظة</label>
      <select
        style={selectStyle}
        value={filters.governorateId ?? ''}
        onChange={(e) =>
          setFilters({ governorateId: e.target.value ? Number(e.target.value) : null })
        }
      >
        <option value="">كل المحافظات</option>
        {governorates.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name_ar}
          </option>
        ))}
      </select>

      <label style={{ fontSize: 11, color: 'var(--ink-dim)' }}>نوع المنشأة</label>
      <select
        style={selectStyle}
        value={filters.type ?? ''}
        onChange={(e) => setFilters({ type: e.target.value || null })}
      >
        {TYPE_OPTIONS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      {(filters.governorateId || filters.type) && (
        <button
          onClick={() => setFilters({ governorateId: null, type: null })}
          style={{
            background: 'transparent',
            border: '1px solid var(--line-bright)',
            color: 'var(--ink-dim)',
            borderRadius: 'var(--radius)',
            padding: '5px 10px',
            fontSize: 11,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          مسح الفلترة
        </button>
      )}
    </section>
  );
}
