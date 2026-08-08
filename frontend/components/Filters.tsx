'use client';

import { useDashboardStore } from '@/lib/store';

const GOVERNORATES = [
  { id: 1, name: 'دمشق' }, { id: 2, name: 'ريف دمشق' }, { id: 3, name: 'حلب' },
  { id: 4, name: 'حمص' }, { id: 5, name: 'حماة' }, { id: 6, name: 'اللاذقية' },
  { id: 7, name: 'إدلب' }, { id: 8, name: 'درعا' },
];

const TYPES = [
  { value: 'hospital', label: 'مشفى' },
  { value: 'dispensary', label: 'مستوصف' },
  { value: 'field_point', label: 'نقطة ميدانية' },
];

export function Filters() {
  const filters = useDashboardStore((s) => s.filters);
  const setFilters = useDashboardStore((s) => s.setFilters);

  const selectStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--void)',
    color: 'var(--ink)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius)',
    padding: '6px 8px',
    fontSize: 12,
    fontFamily: 'var(--font-body)',
  };

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

      <label style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
        المحافظة
        <select
          style={{ ...selectStyle, marginTop: 4 }}
          value={filters.governorateId ?? ''}
          onChange={(e) =>
            setFilters({ governorateId: e.target.value ? Number(e.target.value) : null })
          }
        >
          <option value="">كل المحافظات</option>
          {GOVERNORATES.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </label>

      <label style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
        نوع المنشأة
        <select
          style={{ ...selectStyle, marginTop: 4 }}
          value={filters.type ?? ''}
          onChange={(e) => setFilters({ type: e.target.value || null })}
        >
          <option value="">كل الأنواع</option>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </label>
    </section>
  );
}
