// المطوّر: عبدالله زايد الجسار
// مصدر الحالة المركزي الوحيد للبثّ الحي (single source of truth).
// يقوم بدور مكتبة إدارة حالة الـ WebSocket المطلوبة في المواصفة، عبر
// Zustand + مستمع socket رفيع (lib/socket.ts) بمكتبة حقيقية ومُصانة.
import { create } from 'zustand';

export type FacilityStatus = 'GREEN' | 'RED';

export interface Facility {
  id: number;
  name: string;
  type: 'hospital' | 'dispensary' | 'field_point';
  governorate_id: number | null;
  governorate_name?: string;
  lon: number;
  lat: number;
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
  occupancy_pct: number;
  status: FacilityStatus;
  updated_at: string;
}

export interface Ambulance {
  id: number;
  call_sign: string;
  governorate_id: number | null;
  status: 'AVAILABLE' | 'EN_ROUTE' | 'AT_SCENE' | 'OFFLINE';
  assigned_facility_id: number | null;
  lon: number;
  lat: number;
}

export interface Governorate {
  id: number;
  name_ar: string;
  name_en: string;
}

export interface AlertItem {
  facilityId: number;
  kind: string;
  message: string;
  dispatch?: { ambulanceId: number; callSign: string; distanceMeters: number } | null;
  createdAt: string;
}

export interface FilterState {
  governorateId: number | null;
  type: string | null;
}

interface DashboardState {
  facilities: Facility[];
  ambulances: Ambulance[];
  governorates: Governorate[];
  alerts: AlertItem[];
  connectionStatus: 'connecting' | 'live' | 'offline';
  filters: FilterState;
  timeMachine: { active: boolean; timestamp: string | null };
  dataVersion: number; // يتغيّر عند data:changed لإجبار إعادة الجلب

  setFacilities: (facilities: Facility[]) => void;
  setAmbulances: (ambulances: Ambulance[]) => void;
  setGovernorates: (governorates: Governorate[]) => void;
  applyFacilityUpdates: (updates: Partial<Facility>[]) => void;
  pushAlerts: (alerts: AlertItem[]) => void;
  setConnectionStatus: (status: DashboardState['connectionStatus']) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  setTimeMachine: (tm: Partial<DashboardState['timeMachine']>) => void;
  bumpDataVersion: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  facilities: [],
  ambulances: [],
  governorates: [],
  alerts: [],
  connectionStatus: 'connecting',
  filters: { governorateId: null, type: null },
  timeMachine: { active: false, timestamp: null },
  dataVersion: 0,

  setFacilities: (facilities) => set({ facilities }),
  setAmbulances: (ambulances) => set({ ambulances }),
  setGovernorates: (governorates) => set({ governorates }),

  applyFacilityUpdates: (updates) =>
    set((state) => {
      const byId = new Map(state.facilities.map((f) => [f.id, f]));
      for (const u of updates) {
        if (u.id != null && byId.has(u.id)) {
          byId.set(u.id, { ...byId.get(u.id)!, ...u });
        }
      }
      return { facilities: Array.from(byId.values()) };
    }),

  pushAlerts: (alerts) =>
    set((state) => ({ alerts: [...alerts, ...state.alerts].slice(0, 50) })),

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  setTimeMachine: (tm) =>
    set((state) => ({ timeMachine: { ...state.timeMachine, ...tm } })),
  bumpDataVersion: () => set((state) => ({ dataVersion: state.dataVersion + 1 })),
}));
