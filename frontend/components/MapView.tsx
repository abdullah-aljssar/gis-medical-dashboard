// المطوّر: عبدالله زايد الجسار
'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDashboardStore } from '@/lib/store';
import { StatusBadge } from './StatusBadge';

const SYRIA_CENTER: [number, number] = [35.0, 38.3];

function facilityIcon(status: 'GREEN' | 'RED', type: string) {
  const color = status === 'RED' ? 'var(--status-red)' : 'var(--status-green)';
  const pulseClass = status === 'RED' ? 'pulse-red' : '';
  // شكل مختلف حسب النوع: مربع للمشفى، دائرة للمستوصف، معيّن للنقطة الميدانية
  const size = type === 'hospital' ? 14 : 11;
  const radius = type === 'dispensary' ? '50%' : type === 'field_point' ? '2px' : '3px';
  const rotate = type === 'field_point' ? 'transform:rotate(45deg);' : '';
  return L.divIcon({
    className: '',
    html: `<span class="${pulseClass}" style="
      display:block; width:${size}px; height:${size}px; border-radius:${radius};
      background:${color}; border:2px solid rgba(255,255,255,0.85); ${rotate}
    "></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function ambulanceIcon(status: string) {
  const color =
    status === 'EN_ROUTE'
      ? 'var(--status-amber)'
      : status === 'AT_SCENE'
      ? 'var(--status-red)'
      : 'var(--accent)';
  return L.divIcon({
    className: '',
    html: `<span style="
      display:block; width:10px; height:10px; transform:rotate(45deg);
      background:${color}; border:1.5px solid rgba(255,255,255,0.9);
    "></span>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

const AMB_STATUS_AR: Record<string, string> = {
  AVAILABLE: 'متاحة',
  EN_ROUTE: 'في الطريق',
  AT_SCENE: 'في الموقع',
  OFFLINE: 'خارج الخدمة',
};

function ClickCapture({ onPick }: { onPick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      if (onPick) onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MapView({ onPickLocation }: { onPickLocation?: (lat: number, lon: number) => void }) {
  const facilities = useDashboardStore((s) => s.facilities);
  const ambulances = useDashboardStore((s) => s.ambulances);

  const routeLines = ambulances
    .filter((a) => a.status === 'EN_ROUTE' && a.assigned_facility_id)
    .map((a) => {
      const facility = facilities.find((f) => f.id === a.assigned_facility_id);
      if (!facility) return null;
      return {
        key: a.id,
        positions: [
          [a.lat, a.lon],
          [facility.lat, facility.lon],
        ] as [number, number][],
      };
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
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap &copy; CARTO"
        />

        {onPickLocation && <ClickCapture onPick={onPickLocation} />}

        {routeLines.map((r) => (
          <Polyline
            key={r.key}
            positions={r.positions}
            pathOptions={{ color: '#2dd4bf', weight: 2, dashArray: '4 6', opacity: 0.8 }}
          />
        ))}

        <MarkerClusterGroup chunkedLoading maxClusterRadius={45}>
          {facilities.map((f) => (
            <Marker key={f.id} position={[f.lat, f.lon]} icon={facilityIcon(f.status, f.type)}>
              <Popup>
                <div style={{ fontFamily: 'var(--font-body)', minWidth: 190 }}>
                  <strong>{f.name}</strong>
                  <div style={{ margin: '6px 0' }}>
                    <StatusBadge status={f.status} />
                  </div>
                  <div className="data-mono" style={{ fontSize: 12, lineHeight: 1.7 }}>
                    الإشغال: {f.occupancy_pct}% ({f.occupied_beds}/{f.total_beds})
                    <br />
                    الأسرّة المتاحة: {f.available_beds}
                    {f.governorate_name && (
                      <>
                        <br />
                        المحافظة: {f.governorate_name}
                      </>
                    )}
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
                {a.call_sign} — {AMB_STATUS_AR[a.status] || a.status}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* مفتاح الخريطة (Legend) — يحسّن قابلية الاستخدام */}
      <div
        className="data-mono"
        style={{
          position: 'absolute',
          bottom: 12,
          insetInlineStart: 12,
          zIndex: 500,
          background: 'rgba(16,21,18,0.9)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
          padding: '8px 10px',
          fontSize: 10.5,
          color: 'var(--ink-dim)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          backdropFilter: 'blur(4px)',
        }}
      >
        <LegendRow color="var(--status-green)" label="منشأة طبيعية" shape="dot" />
        <LegendRow color="var(--status-red)" label="منشأة حرجة" shape="dot" />
        <LegendRow color="var(--accent)" label="إسعاف متاح" shape="diamond" />
        <LegendRow color="var(--status-amber)" label="إسعاف في الطريق" shape="diamond" />
      </div>
    </div>
  );
}

function LegendRow({ color, label, shape }: { color: string; label: string; shape: 'dot' | 'diamond' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span
        style={{
          width: 9,
          height: 9,
          background: color,
          borderRadius: shape === 'dot' ? '50%' : '1px',
          transform: shape === 'diamond' ? 'rotate(45deg)' : 'none',
          display: 'inline-block',
        }}
      />
      {label}
    </div>
  );
}
