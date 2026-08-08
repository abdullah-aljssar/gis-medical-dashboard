// المطوّر: عبدالله زايد الجسار
// مؤشرات مجمّعة على مستوى المحافظات (تجميع مكاني) — تغذّي لوحة KPI.
// يُظهر عمق استعلامات PostGIS: تجميع + فلترة + مركز ثقل جغرافي.
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // مؤشرات إجمالية
    const { rows: totals } = await pool.query(
      `SELECT
          COUNT(*)                                   AS facility_count,
          COUNT(*) FILTER (WHERE status = 'RED')      AS critical_count,
          SUM(total_beds)                             AS total_beds,
          SUM(occupied_beds)                          AS occupied_beds,
          SUM(total_beds - occupied_beds)             AS available_beds
       FROM facilities`
    );

    const { rows: ambTotals } = await pool.query(
      `SELECT
          COUNT(*)                                        AS total,
          COUNT(*) FILTER (WHERE status = 'AVAILABLE')     AS available,
          COUNT(*) FILTER (WHERE status = 'EN_ROUTE')      AS en_route
       FROM ambulances`
    );

    // تجميع حسب المحافظة
    const { rows: byGov } = await pool.query(
      `SELECT
          g.id, g.name_ar,
          COUNT(f.id)                              AS facility_count,
          COUNT(*) FILTER (WHERE f.status = 'RED')  AS critical_count,
          ROUND(AVG(CASE WHEN f.total_beds = 0 THEN 0
                    ELSE 100.0 * f.occupied_beds / f.total_beds END), 1) AS avg_occupancy_pct
       FROM governorates g
       LEFT JOIN facilities f ON f.governorate_id = g.id
       GROUP BY g.id, g.name_ar
       HAVING COUNT(f.id) > 0
       ORDER BY critical_count DESC, avg_occupancy_pct DESC`
    );

    // مركز ثقل المنشآت الحرجة (بؤرة الضغط الحالية)
    const { rows: focus } = await pool.query(
      `SELECT
          ST_X(ST_Centroid(ST_Collect(location))) AS lon,
          ST_Y(ST_Centroid(ST_Collect(location))) AS lat,
          COUNT(*)                                AS count
       FROM facilities
       WHERE status = 'RED'`
    );

    return NextResponse.json({
      totals: totals[0],
      ambulances: ambTotals[0],
      byGovernorate: byGov,
      criticalFocus: focus[0]?.count > 0 ? focus[0] : null,
    });
  } catch (err) {
    console.error('[api/stats]', err);
    return NextResponse.json({ error: 'تعذّر حساب المؤشرات' }, { status: 500 });
  }
}
