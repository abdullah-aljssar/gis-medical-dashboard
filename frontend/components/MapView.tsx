'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDashboardStore } from '@/lib/store';
import { StatusBadge } from './StatusBadge';

const SYRIA_CENTER: [number, number] = [35.0, 38.0];

function facilityIcon(status: 'GREEN' | 'RED') {
  const color = status === 'RED' ? 'var(--status-red)' : 'var(--status-green)';
  const pulseClass = status === 'RED' ? 'pulse-red' : '';
  return L.divIcon({
    className: '',
    html: `<span class="${pulseClass}" style="
      display:block; width:12px; height:12px; border-radius:50%;
      background:${color}; border:2px solid rgba(255,255,255,0.85);
    "></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function ambulanceIcon(status: string) {
  const color = status === 'EN_ROUTE' ? 'var(--status-amber)' : 'var(--accent)';
  return L.divIcon({
    className: '',
    html: `<span style="
      display:block; width:9px; height:9px; transform:rotate(45deg);
      background:${color}; border:1.5px solid rgba(255,255,255,0.85);
    "></span>`,
    iconSize: [9, 9],
    iconAnchor: [4, 4],
  });
}

export function MapView() {
  const facilities = useDashboardStore((s) => s.facilities);
  const ambulances = useDashboardStore((s) => s.ambulances);

  // Route lines: connect each EN_ROUTE ambulance to its assigned facility.
  const routeLines = ambulances
    .filter((a) => a.status === 'EN_ROUTE' && a.assigned_facility_id)
    .map((a) => {
      const facility = facilities.find((f) => f.id === a.assigned_facility_id);
      if (!facility) return null;
      return { key: a.id, positions: [[a.lat, a.lon], [facility.lat, facility.lon]] as [number, number][] };
    })
    .filter(Boolean) as { key: number; positions: [number, number][] }[];

  return (
    <div
      className="boot-2"
      style={{
        position: 'relative',
        height: '100%',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
      }}
    >
      <MapContainer
        center={SYRIA_CENTER}
        zoom={7}
        style={{ height: '100%', width: '100%', background: 'var(--void)' }}
        zoomControl={false}
      >
        {/* Dark tile source — CARTO's free dark-matter basemap, no API key required */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap &copy; CARTO'
        />

        {routeLines.map((r) => (
          <Polyline
            key={r.key}
            positions={r.positions}
            pathOptions={{ color: '#2dd4bf', weight: 2, dashArray: '4 6', opacity: 0.8 }}
          />
        ))}

        <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
          {facilities.map((f) => (
            <Marker key={f.id} position={[f.lat, f.lon]} icon={facilityIcon(f.status)}>
              <Popup>
                <div style={{ fontFamily: 'var(--font-body)', minWidth: 180 }}>
                  <strong>{f.name}</strong>
                  <div style={{ margin: '6px 0' }}>
                    <StatusBadge status={f.status} />
                  </div>
                  <div className="data-mono" style={{ fontSize: 12 }}>
                    الإشغال: {f.occupancy_pct}% ({f.occupied_beds}/{f.total_beds})
                    <br />
                    الأسرّة المتاحة: {f.available_beds}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>

        {ambulances.map((a) => (
          <Marker key={`amb-${a.id}`} position={[a.lat, a.lon]} icon={ambulanceIcon(a.status)}>
            <Popup>
              <div className="data-mono" style={{ fontSize: 12 }}>
                {a.call_sign} — {a.status}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
