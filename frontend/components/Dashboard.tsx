// المطوّر: عبدالله زايد الجسار
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useDashboardStore } from '@/lib/store';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { Header } from './Header';
import { AlertPanel } from './AlertPanel';
import { Filters } from './Filters';
import { OccupancySummary } from './OccupancySummary';
import { CriticalFacilitiesList } from './CriticalFacilitiesList';
import { TimeMachine } from './TimeMachine';
import { DataManager } from './DataManager';

// Leaflet يلمس window عند الاستيراد، لذا يجب ألّا تُصيَّر الخريطة أثناء SSR.
const MapView = dynamic(() => import('./MapView').then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--ink-faint)' }}>
      جارٍ تحميل الخريطة...
    </div>
  ),
});

export function Dashboard() {
  const filters = useDashboardStore((s) => s.filters);
  const timeMachine = useDashboardStore((s) => s.timeMachine);
  const dataVersion = useDashboardStore((s) => s.dataVersion);
  const setFacilities = useDashboardStore((s) => s.setFacilities);
  const setAmbulances = useDashboardStore((s) => s.setAmbulances);
  const setGovernorates = useDashboardStore((s) => s.setGovernorates);

  const [showManager, setShowManager] = useState(false);

  // اتصال Socket مرة واحدة
  useEffect(() => {
    connectSocket();
    return () => disconnectSocket();
  }, []);

  // جلب المحافظات مرة واحدة (لقوائم الفلترة والإدخال)
  useEffect(() => {
    fetch('/api/governorates')
      .then((r) => r.json())
      .then((d) => d.governorates && setGovernorates(d.governorates))
      .catch(() => {});
  }, [setGovernorates]);

  // إعادة الجلب عند: تغيّر الفلترة، أو تغيّر البيانات (CRUD) — إلا في وضع
  // الآلة الزمنية (حينها اللقطة التاريخية تملك البيانات).
  useEffect(() => {
    if (timeMachine.active) return;

    const params = new URLSearchParams();
    if (filters.governorateId) params.set('governorate_id', String(filters.governorateId));
    if (filters.type) params.set('type', filters.type);

    fetch(`/api/facilities?${params}`)
      .then((r) => r.json())
      .then((d) => d.facilities && setFacilities(d.facilities))
      .catch(() => {});

    const ambParams = new URLSearchParams();
    if (filters.governorateId) ambParams.set('governorate_id', String(filters.governorateId));

    fetch(`/api/ambulances?${ambParams}`)
      .then((r) => r.json())
      .then((d) => d.ambulances && setAmbulances(d.ambulances))
      .catch(() => {});
  }, [filters, timeMachine.active, dataVersion, setFacilities, setAmbulances]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative', zIndex: 1 }}>
      <Header onManageData={() => setShowManager(true)} />

      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '340px 1fr', // شريط الكونسول | الخريطة
          gap: 14,
          padding: 14,
          minHeight: 0,
        }}
      >
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          <AlertPanel />
          <CriticalFacilitiesList />
          <Filters />
          <OccupancySummary />
        </aside>

        <main style={{ minHeight: 0 }}>
          <MapView />
        </main>
      </div>

      <TimeMachine />

      {showManager && <DataManager onClose={() => setShowManager(false)} />}
    </div>
  );
}
