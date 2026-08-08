// المطوّر: عبدالله زايد الجسار
// واجهة إدارة البيانات (CRUD) — إضافة/تعديل/حذف المنشآت وسيارات الإسعاف.
// هذه هي الواجهة التي تتيح للمدير إدخال قواعد البيانات مباشرة، وكل عملية
// تُبثّ فوراً لكل اللوحات المتصلة عبر السيرفر الحي.
'use client';

import { useState } from 'react';
import { useDashboardStore, Facility, Ambulance } from '@/lib/store';
import { realtimeServerUrl } from '@/lib/socket';

type Tab = 'facilities' | 'ambulances';

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--void)',
  border: '1px solid var(--line-bright)',
  color: 'var(--ink)',
  borderRadius: 'var(--radius)',
  padding: '7px 10px',
  fontSize: 13,
  fontFamily: 'var(--font-body)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--ink-dim)',
  marginBottom: 3,
  display: 'block',
};

const FACILITY_TYPES = [
  { value: 'hospital', label: 'مشفى' },
  { value: 'dispensary', label: 'مستوصف' },
  { value: 'field_point', label: 'نقطة ميدانية' },
];

const AMB_STATUSES = [
  { value: 'AVAILABLE', label: 'متاحة' },
  { value: 'EN_ROUTE', label: 'في الطريق' },
  { value: 'AT_SCENE', label: 'في الموقع' },
  { value: 'OFFLINE', label: 'خارج الخدمة' },
];

export function DataManager({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('facilities');
  const facilities = useDashboardStore((s) => s.facilities);
  const ambulances = useDashboardStore((s) => s.ambulances);
  const governorates = useDashboardStore((s) => s.governorates);
  const bumpDataVersion = useDashboardStore((s) => s.bumpDataVersion);

  const [editingFacility, setEditingFacility] = useState<Partial<Facility> | null>(null);
  const [editingAmbulance, setEditingAmbulance] = useState<Partial<Ambulance> | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function saveFacility() {
    if (!editingFacility?.name || editingFacility?.lat == null || editingFacility?.lon == null) {
      setMsg('الاسم والإحداثيات مطلوبة');
      return;
    }
    setBusy(true);
    setMsg(null);
    const body = {
      name: editingFacility.name,
      type: editingFacility.type || 'hospital',
      governorate_id: editingFacility.governorate_id || null,
      lon: Number(editingFacility.lon),
      lat: Number(editingFacility.lat),
      total_beds: Number(editingFacility.total_beds || 0),
      occupied_beds: Number(editingFacility.occupied_beds || 0),
    };
    try {
      const url = editingFacility.id
        ? `${realtimeServerUrl()}/api/facilities/${editingFacility.id}`
        : `${realtimeServerUrl()}/api/facilities`;
      const res = await fetch(url, {
        method: editingFacility.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setEditingFacility(null);
      bumpDataVersion();
      setMsg('تم الحفظ');
    } catch {
      setMsg('تعذّر الحفظ — تحقّق من الاتصال بالسيرفر');
    } finally {
      setBusy(false);
    }
  }

  async function deleteFacility(id: number) {
    setBusy(true);
    try {
      await fetch(`${realtimeServerUrl()}/api/facilities/${id}`, { method: 'DELETE' });
      bumpDataVersion();
    } catch {
      setMsg('تعذّر الحذف');
    } finally {
      setBusy(false);
    }
  }

  async function saveAmbulance() {
    if (!editingAmbulance?.call_sign || editingAmbulance?.lat == null || editingAmbulance?.lon == null) {
      setMsg('الرمز والإحداثيات مطلوبة');
      return;
    }
    setBusy(true);
    setMsg(null);
    const body = {
      call_sign: editingAmbulance.call_sign,
      governorate_id: editingAmbulance.governorate_id || null,
      lon: Number(editingAmbulance.lon),
      lat: Number(editingAmbulance.lat),
      status: editingAmbulance.status || 'AVAILABLE',
    };
    try {
      const url = editingAmbulance.id
        ? `${realtimeServerUrl()}/api/ambulances/${editingAmbulance.id}`
        : `${realtimeServerUrl()}/api/ambulances`;
      const res = await fetch(url, {
        method: editingAmbulance.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setEditingAmbulance(null);
      bumpDataVersion();
      setMsg('تم الحفظ');
    } catch {
      setMsg('تعذّر الحفظ — تحقّق من الاتصال بالسيرفر');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAmbulance(id: number) {
    setBusy(true);
    try {
      await fetch(`${realtimeServerUrl()}/api/ambulances/${id}`, { method: 'DELETE' });
      bumpDataVersion();
    } catch {
      setMsg('تعذّر الحذف');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0,0,0,0.6)',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(760px, 100%)',
          maxHeight: '88vh',
          overflow: 'hidden',
          background: 'var(--panel)',
          border: '1px solid var(--line-bright)',
          borderRadius: 'var(--radius)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* رأس */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>إدارة البيانات</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--line-bright)',
              color: 'var(--ink-dim)',
              borderRadius: 'var(--radius)',
              padding: '4px 12px',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            إغلاق
          </button>
        </div>

        {/* تبويبات */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--line)' }}>
          <TabButton active={tab === 'facilities'} onClick={() => setTab('facilities')}>
            المنشآت الطبية ({facilities.length})
          </TabButton>
          <TabButton active={tab === 'ambulances'} onClick={() => setTab('ambulances')}>
            سيارات الإسعاف ({ambulances.length})
          </TabButton>
        </div>

        {msg && (
          <div
            className="data-mono"
            style={{
              padding: '8px 18px',
              fontSize: 12,
              color: msg.includes('تعذّر') ? 'var(--status-red)' : 'var(--status-green)',
              borderBottom: '1px solid var(--line)',
            }}
          >
            {msg}
          </div>
        )}

        {/* المحتوى */}
        <div style={{ overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tab === 'facilities' ? (
            <>
              {/* نموذج إضافة/تعديل منشأة */}
              {editingFacility ? (
                <div
                  style={{
                    border: '1px solid var(--line-bright)',
                    borderRadius: 'var(--radius)',
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    background: 'var(--void)',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {editingFacility.id ? 'تعديل منشأة' : 'منشأة جديدة'}
                  </div>
                  <div>
                    <label style={labelStyle}>اسم المنشأة</label>
                    <input
                      style={inputStyle}
                      value={editingFacility.name || ''}
                      onChange={(e) => setEditingFacility({ ...editingFacility, name: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={labelStyle}>النوع</label>
                      <select
                        style={inputStyle}
                        value={editingFacility.type || 'hospital'}
                        onChange={(e) =>
                          setEditingFacility({ ...editingFacility, type: e.target.value as Facility['type'] })
                        }
                      >
                        {FACILITY_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>المحافظة</label>
                      <select
                        style={inputStyle}
                        value={editingFacility.governorate_id ?? ''}
                        onChange={(e) =>
                          setEditingFacility({
                            ...editingFacility,
                            governorate_id: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      >
                        <option value="">—</option>
                        {governorates.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name_ar}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={labelStyle}>خط العرض (lat)</label>
                      <input
                        style={inputStyle}
                        type="number"
                        step="0.0001"
                        value={editingFacility.lat ?? ''}
                        onChange={(e) => setEditingFacility({ ...editingFacility, lat: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>خط الطول (lon)</label>
                      <input
                        style={inputStyle}
                        type="number"
                        step="0.0001"
                        value={editingFacility.lon ?? ''}
                        onChange={(e) => setEditingFacility({ ...editingFacility, lon: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={labelStyle}>إجمالي الأسرّة</label>
                      <input
                        style={inputStyle}
                        type="number"
                        value={editingFacility.total_beds ?? ''}
                        onChange={(e) =>
                          setEditingFacility({ ...editingFacility, total_beds: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>الأسرّة المشغولة</label>
                      <input
                        style={inputStyle}
                        type="number"
                        value={editingFacility.occupied_beds ?? ''}
                        onChange={(e) =>
                          setEditingFacility({ ...editingFacility, occupied_beds: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
                    تلميح: يمكنك أخذ الإحداثيات بالضغط على الخريطة (زر «تحديد من الخريطة»).
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveFacility} disabled={busy} style={primaryBtn}>
                      {busy ? '...' : 'حفظ'}
                    </button>
                    <button onClick={() => setEditingFacility(null)} style={ghostBtn}>
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setEditingFacility({ type: 'hospital' })} style={primaryBtn}>
                  + إضافة منشأة
                </button>
              )}

              {/* قائمة المنشآت */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {facilities.map((f) => (
                  <RowItem
                    key={f.id}
                    title={f.name}
                    subtitle={`${f.occupancy_pct}% · ${f.occupied_beds}/${f.total_beds} سرير`}
                    onEdit={() => setEditingFacility(f)}
                    onDelete={() => deleteFacility(f.id)}
                    busy={busy}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              {/* نموذج إضافة/تعديل إسعاف */}
              {editingAmbulance ? (
                <div
                  style={{
                    border: '1px solid var(--line-bright)',
                    borderRadius: 'var(--radius)',
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    background: 'var(--void)',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {editingAmbulance.id ? 'تعديل سيارة إسعاف' : 'سيارة إسعاف جديدة'}
                  </div>
                  <div>
                    <label style={labelStyle}>الرمز (call sign)</label>
                    <input
                      style={inputStyle}
                      value={editingAmbulance.call_sign || ''}
                      onChange={(e) => setEditingAmbulance({ ...editingAmbulance, call_sign: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={labelStyle}>المحافظة</label>
                      <select
                        style={inputStyle}
                        value={editingAmbulance.governorate_id ?? ''}
                        onChange={(e) =>
                          setEditingAmbulance({
                            ...editingAmbulance,
                            governorate_id: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      >
                        <option value="">—</option>
                        {governorates.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name_ar}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>الحالة</label>
                      <select
                        style={inputStyle}
                        value={editingAmbulance.status || 'AVAILABLE'}
                        onChange={(e) =>
                          setEditingAmbulance({ ...editingAmbulance, status: e.target.value as Ambulance['status'] })
                        }
                      >
                        {AMB_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={labelStyle}>خط العرض (lat)</label>
                      <input
                        style={inputStyle}
                        type="number"
                        step="0.0001"
                        value={editingAmbulance.lat ?? ''}
                        onChange={(e) => setEditingAmbulance({ ...editingAmbulance, lat: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>خط الطول (lon)</label>
                      <input
                        style={inputStyle}
                        type="number"
                        step="0.0001"
                        value={editingAmbulance.lon ?? ''}
                        onChange={(e) => setEditingAmbulance({ ...editingAmbulance, lon: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveAmbulance} disabled={busy} style={primaryBtn}>
                      {busy ? '...' : 'حفظ'}
                    </button>
                    <button onClick={() => setEditingAmbulance(null)} style={ghostBtn}>
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setEditingAmbulance({ status: 'AVAILABLE' })} style={primaryBtn}>
                  + إضافة سيارة إسعاف
                </button>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ambulances.map((a) => (
                  <RowItem
                    key={a.id}
                    title={a.call_sign}
                    subtitle={AMB_STATUSES.find((s) => s.value === a.status)?.label || a.status}
                    onEdit={() => setEditingAmbulance(a)}
                    onDelete={() => deleteAmbulance(a.id)}
                    busy={busy}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  background: 'var(--accent)',
  border: 'none',
  color: 'var(--void)',
  borderRadius: 'var(--radius)',
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'var(--font-body)',
};

const ghostBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--line-bright)',
  color: 'var(--ink-dim)',
  borderRadius: 'var(--radius)',
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: 13,
  fontFamily: 'var(--font-body)',
};

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: active ? 'var(--panel-raised)' : 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
        color: active ? 'var(--ink)' : 'var(--ink-dim)',
        padding: '10px 12px',
        cursor: 'pointer',
        fontSize: 13,
        fontFamily: 'var(--font-body)',
      }}
    >
      {children}
    </button>
  );
}

function RowItem({
  title,
  subtitle,
  onEdit,
  onDelete,
  busy,
}: {
  title: string;
  subtitle: string;
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '8px 10px',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </div>
        <div className="data-mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
          {subtitle}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={onEdit} style={smallBtn}>
          تعديل
        </button>
        {confirm ? (
          <button
            onClick={onDelete}
            disabled={busy}
            style={{ ...smallBtn, borderColor: 'var(--status-red)', color: 'var(--status-red)' }}
          >
            تأكيد؟
          </button>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            style={{ ...smallBtn, borderColor: 'var(--line-bright)', color: 'var(--ink-dim)' }}
          >
            حذف
          </button>
        )}
      </div>
    </div>
  );
}

const smallBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--line-bright)',
  color: 'var(--ink-dim)',
  borderRadius: 'var(--radius)',
  padding: '4px 10px',
  cursor: 'pointer',
  fontSize: 11,
  fontFamily: 'var(--font-body)',
};
