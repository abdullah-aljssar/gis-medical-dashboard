-- ============================================================
-- بيانات أولية (Seed) — مرصد الموارد الطبية
-- المطوّر: عبدالله زايد الجسار
--
-- الإحداثيات تقريبية لمراكز مدن المحافظات (لأغراض العرض).
-- بعض المنشآت مضبوطة قرب عتبة الـ 90% عمداً حتى يُظهر محرّك
-- المحاكاة حركة وتنبيهات فور التشغيل.
-- ============================================================

TRUNCATE governorates, facilities, ambulances, alerts, state_snapshots RESTART IDENTITY CASCADE;

-- ---------- المحافظات (مع مراكزها الجغرافية) ----------
INSERT INTO governorates (name_ar, name_en, center) VALUES
    ('دمشق',      'Damascus',    ST_SetSRID(ST_MakePoint(36.2919, 33.5138), 4326)),
    ('ريف دمشق',  'Rif Dimashq', ST_SetSRID(ST_MakePoint(36.5000, 33.5167), 4326)),
    ('حلب',       'Aleppo',      ST_SetSRID(ST_MakePoint(37.1613, 36.2021), 4326)),
    ('حمص',       'Homs',        ST_SetSRID(ST_MakePoint(36.7167, 34.7333), 4326)),
    ('حماة',      'Hama',        ST_SetSRID(ST_MakePoint(36.7500, 35.1333), 4326)),
    ('اللاذقية',  'Latakia',     ST_SetSRID(ST_MakePoint(35.7833, 35.5333), 4326)),
    ('طرطوس',     'Tartus',      ST_SetSRID(ST_MakePoint(35.8867, 34.8890), 4326)),
    ('إدلب',      'Idlib',       ST_SetSRID(ST_MakePoint(36.6333, 35.9306), 4326)),
    ('درعا',      'Daraa',       ST_SetSRID(ST_MakePoint(36.1021, 32.6189), 4326)),
    ('دير الزور', 'Deir ez-Zor', ST_SetSRID(ST_MakePoint(40.1467, 35.3359), 4326)),
    ('الحسكة',    'Al-Hasakah',  ST_SetSRID(ST_MakePoint(40.7500, 36.5000), 4326)),
    ('السويداء',  'As-Suwayda',  ST_SetSRID(ST_MakePoint(36.5667, 32.7000), 4326));

-- ---------- المنشآت الطبية ----------
-- (name, type, governorate_id, lon, lat, total_beds, occupied_beds, status)
INSERT INTO facilities (name, type, governorate_id, location, total_beds, occupied_beds, status) VALUES
    -- دمشق
    ('مشفى دمشق المركزي',            'hospital',    1, ST_SetSRID(ST_MakePoint(36.2765, 33.5138), 4326), 220, 150, 'GREEN'),
    ('مشفى المواساة الجامعي',        'hospital',    1, ST_SetSRID(ST_MakePoint(36.2841, 33.5020), 4326), 340, 300, 'RED'),
    ('مستوصف المزة',                'dispensary',  1, ST_SetSRID(ST_MakePoint(36.2500, 33.5020), 4326),  20,   6, 'GREEN'),
    ('نقطة طبية - باب توما',         'field_point', 1, ST_SetSRID(ST_MakePoint(36.3140, 33.5150), 4326),  12,  10, 'GREEN'),
    -- ريف دمشق
    ('مشفى دوما العام',             'hospital',    2, ST_SetSRID(ST_MakePoint(36.4020, 33.5720), 4326), 160,  88, 'GREEN'),
    ('مستوصف داريا',                'dispensary',  2, ST_SetSRID(ST_MakePoint(36.2370, 33.4580), 4326),  25,  23, 'GREEN'),
    -- حلب
    ('مشفى حلب الجامعي',            'hospital',    3, ST_SetSRID(ST_MakePoint(37.1613, 36.2021), 4326), 300, 285, 'RED'),
    ('مشفى الرازي',                 'hospital',    3, ST_SetSRID(ST_MakePoint(37.1450, 36.2160), 4326), 210, 120, 'GREEN'),
    ('نقطة طبية - حلب الشرقية',      'field_point', 3, ST_SetSRID(ST_MakePoint(37.1900, 36.2100), 4326),  15,  14, 'RED'),
    -- حمص
    ('مشفى حمص الوطني',             'hospital',    4, ST_SetSRID(ST_MakePoint(36.7167, 34.7333), 4326), 180,  90, 'GREEN'),
    ('مستوصف الوعر',                'dispensary',  4, ST_SetSRID(ST_MakePoint(36.6820, 34.7480), 4326),  28,  25, 'GREEN'),
    -- حماة
    ('مشفى حماة العام',             'hospital',    5, ST_SetSRID(ST_MakePoint(36.7500, 35.1333), 4326), 150,  70, 'GREEN'),
    -- اللاذقية
    ('مشفى اللاذقية الجامعي',        'hospital',    6, ST_SetSRID(ST_MakePoint(35.7833, 35.5333), 4326), 260, 100, 'GREEN'),
    ('نقطة طبية - جبلة',            'field_point', 6, ST_SetSRID(ST_MakePoint(35.9210, 35.3600), 4326),  18,  16, 'GREEN'),
    -- طرطوس
    ('مشفى طرطوس الوطني',           'hospital',    7, ST_SetSRID(ST_MakePoint(35.8867, 34.8890), 4326), 140,  62, 'GREEN'),
    -- إدلب
    ('مستوصف إدلب المركزي',          'dispensary',  8, ST_SetSRID(ST_MakePoint(36.6333, 35.9333), 4326),  30,  29, 'RED'),
    ('نقطة طبية - أريحا',           'field_point', 8, ST_SetSRID(ST_MakePoint(36.5090, 35.8130), 4326),  14,  11, 'GREEN'),
    -- درعا
    ('مشفى درعا الوطني',            'hospital',    9, ST_SetSRID(ST_MakePoint(36.1021, 32.6189), 4326), 120,  55, 'GREEN'),
    -- دير الزور
    ('مشفى دير الزور العام',        'hospital',   10, ST_SetSRID(ST_MakePoint(40.1467, 35.3359), 4326), 130,  118, 'RED'),
    -- الحسكة
    ('مشفى الحسكة الوطني',          'hospital',   11, ST_SetSRID(ST_MakePoint(40.7500, 36.5000), 4326), 110,  60, 'GREEN'),
    -- السويداء
    ('مشفى السويداء الوطني',        'hospital',   12, ST_SetSRID(ST_MakePoint(36.5667, 32.7000), 4326), 100,  44, 'GREEN');

-- ---------- سيارات الإسعاف ----------
-- (call_sign, governorate_id, lon, lat, status)
INSERT INTO ambulances (call_sign, governorate_id, location, status) VALUES
    ('AMB-DMS-01', 1, ST_SetSRID(ST_MakePoint(36.2900, 33.5100), 4326), 'AVAILABLE'),
    ('AMB-DMS-02', 1, ST_SetSRID(ST_MakePoint(36.2600, 33.4950), 4326), 'AVAILABLE'),
    ('AMB-DMS-03', 1, ST_SetSRID(ST_MakePoint(36.3050, 33.5200), 4326), 'AVAILABLE'),
    ('AMB-RDM-01', 2, ST_SetSRID(ST_MakePoint(36.4000, 33.5700), 4326), 'AVAILABLE'),
    ('AMB-ALP-01', 3, ST_SetSRID(ST_MakePoint(37.1500, 36.1950), 4326), 'AVAILABLE'),
    ('AMB-ALP-02', 3, ST_SetSRID(ST_MakePoint(37.1750, 36.2150), 4326), 'AVAILABLE'),
    ('AMB-ALP-03', 3, ST_SetSRID(ST_MakePoint(37.1300, 36.2000), 4326), 'AVAILABLE'),
    ('AMB-HMS-01', 4, ST_SetSRID(ST_MakePoint(36.7200, 34.7300), 4326), 'AVAILABLE'),
    ('AMB-HMS-02', 4, ST_SetSRID(ST_MakePoint(36.6900, 34.7450), 4326), 'AVAILABLE'),
    ('AMB-HMA-01', 5, ST_SetSRID(ST_MakePoint(36.7480, 35.1300), 4326), 'AVAILABLE'),
    ('AMB-LTK-01', 6, ST_SetSRID(ST_MakePoint(35.7900, 35.5300), 4326), 'AVAILABLE'),
    ('AMB-LTK-02', 6, ST_SetSRID(ST_MakePoint(35.9200, 35.3600), 4326), 'AVAILABLE'),
    ('AMB-TRT-01', 7, ST_SetSRID(ST_MakePoint(35.8850, 34.8900), 4326), 'AVAILABLE'),
    ('AMB-IDL-01', 8, ST_SetSRID(ST_MakePoint(36.6400, 35.9300), 4326), 'AVAILABLE'),
    ('AMB-DRA-01', 9, ST_SetSRID(ST_MakePoint(36.1000, 32.6200), 4326), 'AVAILABLE'),
    ('AMB-DEZ-01',10, ST_SetSRID(ST_MakePoint(40.1450, 35.3400), 4326), 'AVAILABLE'),
    ('AMB-HSK-01',11, ST_SetSRID(ST_MakePoint(40.7480, 36.5020), 4326), 'AVAILABLE'),
    ('AMB-SWD-01',12, ST_SetSRID(ST_MakePoint(36.5650, 32.7010), 4326), 'AVAILABLE');
