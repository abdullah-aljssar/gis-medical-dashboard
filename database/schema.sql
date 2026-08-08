-- ============================================================
-- مرصد الموارد الطبية — GIS Medical Response Tracker
-- مخطط قاعدة البيانات (PostgreSQL + PostGIS)
-- المطوّر: عبدالله زايد الجسار
-- ============================================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- حذف الكائنات القديمة إن وُجدت (تشغيل نظيف قابل لإعادة التنفيذ)
DROP VIEW IF EXISTS facility_occupancy CASCADE;
DROP TABLE IF EXISTS state_snapshots CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS ambulances CASCADE;
DROP TABLE IF EXISTS facilities CASCADE;
DROP TABLE IF EXISTS governorates CASCADE;

-- ---------- المحافظات (للفلترة والتجميع الجغرافي) ----------
CREATE TABLE governorates (
    id          SERIAL PRIMARY KEY,
    name_ar     TEXT NOT NULL,
    name_en     TEXT NOT NULL,
    center      GEOMETRY(POINT, 4326),                 -- مركز المحافظة (للتوسيط على الخريطة)
    boundary    GEOMETRY(MULTIPOLYGON, 4326)           -- حدود المحافظة (اختياري، للطبقات اللونية)
);

-- ---------- المنشآت الطبية ----------
-- تشمل: مشافي مركزية، مستوصفات، ونقاط طبية ميدانية.
CREATE TABLE facilities (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    type            TEXT NOT NULL CHECK (type IN ('hospital', 'dispensary', 'field_point')),
    governorate_id  INTEGER REFERENCES governorates(id) ON DELETE SET NULL,
    location        GEOMETRY(POINT, 4326) NOT NULL,
    total_beds      INTEGER NOT NULL DEFAULT 0 CHECK (total_beds >= 0),
    occupied_beds   INTEGER NOT NULL DEFAULT 0 CHECK (occupied_beds >= 0),
    status          TEXT NOT NULL DEFAULT 'GREEN' CHECK (status IN ('GREEN', 'RED')),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- الفهرس المكاني GiST — ضروري لأداء أي استعلام ST_Distance / ST_DWithin.
-- بدونه يتحوّل PostGIS إلى مسح كامل للجدول عند كل بحث عن أقرب نقطة.
CREATE INDEX idx_facilities_location   ON facilities USING GIST (location);
CREATE INDEX idx_facilities_gov        ON facilities (governorate_id);
CREATE INDEX idx_facilities_status     ON facilities (status);

-- ---------- سيارات الإسعاف ----------
CREATE TABLE ambulances (
    id                    SERIAL PRIMARY KEY,
    call_sign             TEXT NOT NULL,
    governorate_id        INTEGER REFERENCES governorates(id) ON DELETE SET NULL,
    location              GEOMETRY(POINT, 4326) NOT NULL,
    status                TEXT NOT NULL DEFAULT 'AVAILABLE'
                              CHECK (status IN ('AVAILABLE', 'EN_ROUTE', 'AT_SCENE', 'OFFLINE')),
    assigned_facility_id  INTEGER REFERENCES facilities(id) ON DELETE SET NULL,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ambulances_location ON ambulances USING GIST (location);
CREATE INDEX idx_ambulances_status   ON ambulances (status);
CREATE INDEX idx_ambulances_gov      ON ambulances (governorate_id);

-- ---------- التنبيهات (أحداث الطوارئ + قرارات التوجيه اليدوي) ----------
CREATE TABLE alerts (
    id            SERIAL PRIMARY KEY,
    facility_id   INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
    ambulance_id  INTEGER REFERENCES ambulances(id) ON DELETE SET NULL,
    kind          TEXT NOT NULL CHECK (kind IN ('OCCUPANCY_CRITICAL', 'MANUAL_DISPATCH', 'EMERGENCY_CALL')),
    message       TEXT NOT NULL,
    acknowledged  BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_created_at ON alerts (created_at DESC);

-- ---------- اللقطات الزمنية (الآلة الزمنية / السجل التاريخي) ----------
-- صف واحد لكل فترة زمنية، يخزّن لقطة JSON مضغوطة لحالة المنشآت والسيارات.
-- هذا ما يغذّي ميزة "العودة بالزمن" دون الحاجة لسجل تدقيق لكل حقل.
CREATE TABLE state_snapshots (
    id               BIGSERIAL PRIMARY KEY,
    captured_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    facilities_json  JSONB NOT NULL,
    ambulances_json  JSONB NOT NULL
);

CREATE INDEX idx_snapshots_captured_at ON state_snapshots (captured_at DESC);

-- ---------- View مساعد: نسبة الإشغال المحسوبة لكل منشأة ----------
-- يطبّق قاعدة المخطط البياني حرفياً: Available Beds = Total - Occupied
-- وعتبة الحالة الحرجة عند تجاوز 90% إشغال.
CREATE OR REPLACE VIEW facility_occupancy AS
SELECT
    f.id,
    f.name,
    f.type,
    f.governorate_id,
    g.name_ar AS governorate_name,
    f.total_beds,
    f.occupied_beds,
    (f.total_beds - f.occupied_beds) AS available_beds,
    CASE WHEN f.total_beds = 0 THEN 0
         ELSE ROUND(100.0 * f.occupied_beds / f.total_beds, 1)
    END AS occupancy_pct,
    f.status,
    f.location,
    ST_X(f.location) AS lon,
    ST_Y(f.location) AS lat,
    f.updated_at
FROM facilities f
LEFT JOIN governorates g ON g.id = f.governorate_id;
