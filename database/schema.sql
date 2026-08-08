-- ============================================================
-- GIS Medical Response Tracker — Database Schema
-- PostgreSQL + PostGIS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------- Governorates (for filtering) ----------
CREATE TABLE governorates (
    id          SERIAL PRIMARY KEY,
    name_ar     TEXT NOT NULL,
    name_en     TEXT NOT NULL,
    boundary    GEOMETRY(POLYGON, 4326)   -- optional, for future choropleth use
);

-- ---------- Medical facilities ----------
-- Includes central hospitals, dispensaries (مستوصفات), and field points.
CREATE TABLE facilities (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    type            TEXT NOT NULL CHECK (type IN ('hospital', 'dispensary', 'field_point')),
    governorate_id  INTEGER REFERENCES governorates(id),
    location        GEOMETRY(POINT, 4326) NOT NULL,
    total_beds      INTEGER NOT NULL DEFAULT 0,
    occupied_beds   INTEGER NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'GREEN' CHECK (status IN ('GREEN', 'RED')),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spatial index — required for any ST_Distance / ST_DWithin query to stay fast
-- as the facility count grows. Without this, PostGIS falls back to a full
-- table scan for every proximity lookup.
CREATE INDEX idx_facilities_location ON facilities USING GIST (location);
CREATE INDEX idx_facilities_governorate ON facilities (governorate_id);
CREATE INDEX idx_facilities_status ON facilities (status);

-- ---------- Ambulances ----------
CREATE TABLE ambulances (
    id              SERIAL PRIMARY KEY,
    call_sign       TEXT NOT NULL,
    governorate_id  INTEGER REFERENCES governorates(id),
    location        GEOMETRY(POINT, 4326) NOT NULL,
    status          TEXT NOT NULL DEFAULT 'AVAILABLE'
                        CHECK (status IN ('AVAILABLE', 'EN_ROUTE', 'AT_SCENE', 'OFFLINE')),
    assigned_facility_id INTEGER REFERENCES facilities(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ambulances_location ON ambulances USING GIST (location);
CREATE INDEX idx_ambulances_status ON ambulances (status);

-- ---------- Alerts (emergency events + manual dispatch decisions) ----------
CREATE TABLE alerts (
    id              SERIAL PRIMARY KEY,
    facility_id     INTEGER REFERENCES facilities(id),
    ambulance_id    INTEGER REFERENCES ambulances(id),
    kind            TEXT NOT NULL CHECK (kind IN ('OCCUPANCY_CRITICAL', 'MANUAL_DISPATCH', 'EMERGENCY_CALL')),
    message         TEXT NOT NULL,
    acknowledged    BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_created_at ON alerts (created_at DESC);

-- ---------- Snapshots (Time-Machine / history) ----------
-- One row per interval (e.g. every 60s from the simulation engine), storing
-- a compact JSON snapshot of facility + ambulance state. This is what powers
-- "rewind to a past date/time" without needing per-field audit logs.
CREATE TABLE state_snapshots (
    id              BIGSERIAL PRIMARY KEY,
    captured_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    facilities_json JSONB NOT NULL,
    ambulances_json JSONB NOT NULL
);

CREATE INDEX idx_snapshots_captured_at ON state_snapshots (captured_at DESC);

-- ---------- Helper view: current occupancy % per facility ----------
CREATE OR REPLACE VIEW facility_occupancy AS
SELECT
    id,
    name,
    type,
    governorate_id,
    total_beds,
    occupied_beds,
    (total_beds - occupied_beds) AS available_beds,
    CASE WHEN total_beds = 0 THEN 0
         ELSE ROUND(100.0 * occupied_beds / total_beds, 1)
    END AS occupancy_pct,
    status,
    location,
    updated_at
FROM facilities;
