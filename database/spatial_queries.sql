-- ============================================================
-- استعلامات PostGIS المكانية المتقدمة
-- المطوّر: عبدالله زايد الجسار
--
-- هذا الملف مرجعي/توثيقي — يجمع الاستعلامات الجغرافية المتقدمة
-- المستخدمة في التطبيق في مكان واحد، لتوضيح منطق الـ GIS بمعزل
-- عن كود التطبيق. جميعها تعتمد على الفهرس المكاني GiST.
-- ============================================================

-- ------------------------------------------------------------
-- 1) أقرب سيارة إسعاف متاحة لمنشأة (KNN + مسافة دائرة عظمى دقيقة)
--    عامل <-> يستخدم فهرس GiST لترشيح المرشحين بسرعة،
--    ثم ST_Distance على النوع geography يعطي مسافة حقيقية بالأمتار.
-- ------------------------------------------------------------
SELECT
    a.id,
    a.call_sign,
    ST_Distance(a.location::geography, f.location::geography) AS distance_meters
FROM ambulances a
CROSS JOIN LATERAL (SELECT location FROM facilities WHERE id = :facility_id) f
WHERE a.status = 'AVAILABLE'
ORDER BY a.location <-> f.location
LIMIT 1;

-- ------------------------------------------------------------
-- 2) كل سيارات الإسعاف ضمن نطاق (مثلاً 10 كم) من منشأة
--    ST_DWithin على geography أسرع من حساب المسافة لكل صف،
--    لأنه يقصّ النطاق أولاً عبر الفهرس المكاني.
-- ------------------------------------------------------------
SELECT
    a.id,
    a.call_sign,
    a.status,
    ROUND(ST_Distance(a.location::geography, f.location::geography)::numeric, 0) AS distance_meters
FROM ambulances a
CROSS JOIN LATERAL (SELECT location FROM facilities WHERE id = :facility_id) f
WHERE ST_DWithin(a.location::geography, f.location::geography, 10000)   -- 10 كم
ORDER BY distance_meters;

-- ------------------------------------------------------------
-- 3) مؤشرات الإشغال والتصنيف اللوني لكل محافظة (تجميع مكاني)
--    يجمع المنشآت حسب المحافظة ويحسب متوسط الإشغال وعدد
--    المنشآت الحرجة — أساس لوحة المؤشرات والطبقات اللونية.
-- ------------------------------------------------------------
SELECT
    g.id,
    g.name_ar,
    COUNT(f.id)                                  AS facility_count,
    SUM(f.total_beds)                            AS total_beds,
    SUM(f.occupied_beds)                         AS occupied_beds,
    SUM(f.total_beds - f.occupied_beds)          AS available_beds,
    ROUND(AVG(CASE WHEN f.total_beds = 0 THEN 0
              ELSE 100.0 * f.occupied_beds / f.total_beds END), 1) AS avg_occupancy_pct,
    COUNT(*) FILTER (WHERE f.status = 'RED')      AS critical_count
FROM governorates g
LEFT JOIN facilities f ON f.governorate_id = g.id
GROUP BY g.id, g.name_ar
ORDER BY critical_count DESC, avg_occupancy_pct DESC;

-- ------------------------------------------------------------
-- 4) مركز الثقل الجغرافي للمنشآت الحرجة (ST_Centroid على تجميع)
--    يعطي نقطة واحدة تمثّل "بؤرة الضغط" الحالية على الشبكة الصحية،
--    مفيدة لتوجيه الموارد الاحتياطية نحو أكثر منطقة احتياجاً.
-- ------------------------------------------------------------
SELECT
    ST_X(ST_Centroid(ST_Collect(location))) AS focus_lon,
    ST_Y(ST_Centroid(ST_Collect(location))) AS focus_lat,
    COUNT(*)                                AS critical_facilities
FROM facilities
WHERE status = 'RED';

-- ------------------------------------------------------------
-- 5) مصفوفة التغطية: لكل منشأة حرجة، أقرب سيارة إسعاف متاحة
--    استعلام LATERAL يطبّق منطق "أقرب جار" لكل صف على حدة —
--    يعطي المدير صورة فورية عن جاهزية الاستجابة لكل حالة حرجة.
-- ------------------------------------------------------------
SELECT
    f.id            AS facility_id,
    f.name          AS facility_name,
    nearest.call_sign,
    ROUND(nearest.distance_meters::numeric, 0) AS distance_meters
FROM facilities f
LEFT JOIN LATERAL (
    SELECT
        a.call_sign,
        ST_Distance(a.location::geography, f.location::geography) AS distance_meters
    FROM ambulances a
    WHERE a.status = 'AVAILABLE'
    ORDER BY a.location <-> f.location
    LIMIT 1
) nearest ON true
WHERE f.status = 'RED'
ORDER BY distance_meters DESC NULLS FIRST;   -- الأبعد عن الإسعاف أولاً = الأولوية القصوى
