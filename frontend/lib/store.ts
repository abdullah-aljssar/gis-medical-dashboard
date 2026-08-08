import { create } from 'zustand';

export type FacilityStatus = 'GREEN' | 'RED';

export interface Facility {
  id: number;
  name: string;
  type: 'hospital' | 'dispensary' | 'field_point';
  governorate_id: number;
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
  status: 'AVAILABLE' | 'EN_ROUTE' | 'AT_SCENE' | 'OFFLINE';
  assigned_facility_id: number | null;
  lon: number;
  lat: number;
}

export interface AlertItem {
  facilityId: number;
  kind: string;
  message: string;
  dispatch?: { ambulanceId: number; callSign: string; distanceMeters: number } | null;
  createdAt: string;
}

interface DashboardState {
  facilities: Facility[];
  ambulances: Ambulance[];
  alerts: AlertItem[];
  connectionStatus: 'connecting' | 'live' | 'offline';
  filters: { governorateId: number | null; type: string | null };
  timeMachine: { active: boolean; timestamp: string | null };

  setFacilities: (facilities: Facility[]) => void;
  setAmbulances: (ambulances: Ambulance[]) => void;
  applyFacilityUpdates: (updates: Partial<Facility>[]) => void;
  pushAlerts: (alerts: AlertItem[]) => void;
  setConnectionStatus: (status: DashboardState['connectionStatus']) => void;
  setFilters: (filters: Partial<DashboardState['filters']>) => void;
  setTimeMachine: (tm: Partial<DashboardState['timeMachine']>) => void;
}

// This single store is the "single source of truth for realtime state" that
// the original brief wanted from a WebSocket state-management library.
// Zustand + a thin socket listener (lib/socket.ts) does the same job with
// a real, maintained package instead of the non-existent one.
export const useDashboardStore = create<DashboardState>((set) => ({
  facilities: [],
  ambulances: [],
  alerts: [],
  connectionStatus: 'connecting',
  filters: { governorateId: null, type: null },
  timeMachine: { active: false, timestamp: null },

  setFacilities: (facilities) => set({ facilities }),
  setAmbulances: (ambulances) => set({ ambulances }),

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
}));
