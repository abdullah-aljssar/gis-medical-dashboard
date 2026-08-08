import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET /api/nearest-ambulance?facility_id=3
// Same logic as realtime-server/simulation/routing.js findNearestAmbulance,
// exposed here as a direct, on-demand PostGIS query for the dashboard's
// "find nearest" action outside of the automatic routing cycle.
export async function GET(req: NextRequest) {
  const facilityId = req.nextUrl.searchParams.get('facility_id');
  if (!facilityId) {
    return NextResponse.json({ error: 'facility_id مطلوب' }, { status: 400 });
  }

  try {
    const { rows: facilityRows } = await pool.query(
      `SELECT location FROM facilities WHERE id = $1`,
      [facilityId]
    );
    if (!facilityRows[0]) {
      return NextResponse.json({ error: 'المنشأة غير موجودة' }, { status: 404 });
    }

    const { rows } = await pool.query(
      `SELECT
          id, call_sign,
          ST_Distance(location::geography, $1::geography) AS distance_meters
       FROM ambulances
       WHERE status = 'AVAILABLE'
       ORDER BY location <-> $1
       LIMIT 1`,
      [facilityRows[0].location]
    );

    if (!rows[0]) {
      return NextResponse.json({ error: 'لا توجد سيارة إسعاف متاحة حالياً' }, { status: 409 });
    }

    return NextResponse.json({ nearest: rows[0] });
  } catch (err) {
    console.error('[api/nearest-ambulance] query failed', err);
    return NextResponse.json({ error: 'فشل الاستعلام المكاني' }, { status: 500 });
  }
}
