'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useDashboardStore } from '@/lib/store';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { Header } from './Header';
import { AlertPanel } from './AlertPanel';
import { Filters } from './Filters';
import { OccupancySummary } from './OccupancySummary';
import { CriticalFacilitiesList } from './CriticalFacilitiesList';
import { TimeMachine } from './TimeMachine';

// Leaflet touches `window` at import time, so the map must never render
// during server-side rendering.
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
  const setFacilities = useDashboardStore((s) => s.setFacilities);
  const setAmbulances = useDashboardStore((s) => s.setAmbulances);

  useEffect(() => {
    connectSocket();
    return () => disconnectSocket();
  }, []);

  // Re-fetch whenever filters change, unless we're browsing history —
  // the time machine owns the data in that mode until the manager returns
  // to live view.
  useEffect(() => {
    if (timeMachine.active) return;

    const params = new URLSearchParams();
    if (filters.governorateId) params.set('governorate_id', String(filters.governorateId));
    if (filters.type) params.set('type', filters.type);

    fetch(`/api/facilities?${params}`)
      .then((r) => r.json())
      .then((d) => d.facilities && setFacilities(d.facilities))
      .catch(() => {/* transient fetch failure — next interval/filter change retries */});

    fetch(`/api/ambulances?${params}`)
      .then((r) => r.json())
      .then((d) => d.ambulances && setAmbulances(d.ambulances))
      .catch(() => {});
  }, [filters, timeMachine.active, setFacilities, setAmbulances]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative', zIndex: 1 }}>
      <Header />

      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '320px 1fr', // console rail | map — rail reads first in RTL
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
    </div>
  );
}
