// المطوّر: عبدالله زايد الجسار
// أقرب سيارة إسعاف متاحة لمنشأة — استعلام PostGIS مكاني مباشر
// (عامل KNN <-> المدعوم بفهرس GiST + ST_Distance بدقة متر).
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const facilityId = req.nextUrl.searchParams.get('facility_id');
  if (!facilityId) {
    return NextResponse.json({ error: 'facility_id مطلوب' }, { status: 400 });
  }

  try {
    const { rows: facilityRows } = await pool.query(
      `SELECT location FROM facilities WHERE id = $1`,
      [Number(facilityId)]
    );
    if (!facilityRows[0]) {
      return NextResponse.json({ error: 'المنشأة غير موجودة' }, { status: 404 });
    }

    const { rows } = await pool.query(
      `SELECT
          a.id,
          a.call_sign,
          ST_Distance(a.location::geography, f.location::geography) AS distance_meters
       FROM ambulances a
       CROSS JOIN (SELECT location FROM facilities WHERE id = $1) f
       WHERE a.status = 'AVAILABLE'
       ORDER BY a.location <-> f.location
       LIMIT 1`,
      [Number(facilityId)]
    );

    return NextResponse.json({ nearest: rows[0] || null });
  } catch (err) {
    console.error('[api/nearest-ambulance]', err);
    return NextResponse.json({ error: 'تعذّر تنفيذ الاستعلام المكاني' }, { status: 500 });
  }
}
