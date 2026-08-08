-- ============================================================
-- Seed data for local development / demo
-- Coordinates are approximate city-center points for each governorate capital.
-- Replace with verified facility data before any real deployment.
-- ============================================================

INSERT INTO governorates (name_ar, name_en) VALUES
    ('دمشق', 'Damascus'),
    ('ريف دمشق', 'Rif Dimashq'),
    ('حلب', 'Aleppo'),
    ('حمص', 'Homs'),
    ('حماة', 'Hama'),
    ('اللاذقية', 'Latakia'),
    ('إدلب', 'Idlib'),
    ('درعا', 'Daraa');

-- Facilities: (name, type, governorate_id, lon, lat, total_beds, occupied_beds)
INSERT INTO facilities (name, type, governorate_id, location, total_beds, occupied_beds, status)
VALUES
    ('مشفى دمشق المركزي', 'hospital', 1, ST_SetSRID(ST_MakePoint(36.2765, 33.5138), 4326), 220, 150, 'GREEN'),
    ('مستوصف المزة', 'dispensary', 1, ST_SetSRID(ST_MakePoint(36.2500, 33.5020), 4326), 20, 6, 'GREEN'),
    ('مشفى حلب الجامعي', 'hospital', 3, ST_SetSRID(ST_MakePoint(37.1613, 36.2021), 4326), 300, 285, 'RED'),
    ('نقطة طبية ميدانية - حلب الشرقية', 'field_point', 3, ST_SetSRID(ST_MakePoint(37.1900, 36.2100), 4326), 15, 14, 'RED'),
    ('مشفى حمص الوطني', 'hospital', 4, ST_SetSRID(ST_MakePoint(36.7167, 34.7333), 4326), 180, 90, 'GREEN'),
    ('مشفى حماة العام', 'hospital', 5, ST_SetSRID(ST_MakePoint(36.7500, 35.1333), 4326), 150, 70, 'GREEN'),
    ('مشفى اللاذقية الجامعي', 'hospital', 6, ST_SetSRID(ST_MakePoint(35.7833, 35.5333), 4326), 260, 100, 'GREEN'),
    ('مستوصف إدلب المركزي', 'dispensary', 7, ST_SetSRID(ST_MakePoint(36.6333, 35.9333), 4326), 30, 29, 'RED'),
    ('مشفى درعا الوطني', 'hospital', 8, ST_SetSRID(ST_MakePoint(36.1021, 32.6189), 4326), 120, 55, 'GREEN');

-- Ambulances: (call_sign, governorate_id, lon, lat, status)
INSERT INTO ambulances (call_sign, governorate_id, location, status)
VALUES
    ('AMB-DMS-01', 1, ST_SetSRID(ST_MakePoint(36.2900, 33.5100), 4326), 'AVAILABLE'),
    ('AMB-DMS-02', 1, ST_SetSRID(ST_MakePoint(36.2600, 33.4950), 4326), 'AVAILABLE'),
    ('AMB-ALP-01', 3, ST_SetSRID(ST_MakePoint(37.1500, 36.1950), 4326), 'AVAILABLE'),
    ('AMB-ALP-02', 3, ST_SetSRID(ST_MakePoint(37.1750, 36.2150), 4326), 'EN_ROUTE'),
    ('AMB-HMS-01', 4, ST_SetSRID(ST_MakePoint(36.7200, 34.7300), 4326), 'AVAILABLE'),
    ('AMB-LTK-01', 6, ST_SetSRID(ST_MakePoint(35.7900, 35.5300), 4326), 'AVAILABLE'),
    ('AMB-IDL-01', 7, ST_SetSRID(ST_MakePoint(36.6400, 35.9300), 4326), 'AVAILABLE');
