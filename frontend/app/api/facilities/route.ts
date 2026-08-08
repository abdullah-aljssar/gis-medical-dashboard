import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// Stateless GET — this is exactly what Vercel serverless functions are
// good at: no persistent connection needed, just query-in / JSON-out.
export async function GET(req: NextRequest) {
  const governorateId = req.nextUrl.searchParams.get('governorate_id');
  const type = req.nextUrl.searchParams.get('type');

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (governorateId) {
    params.push(Number(governorateId));
    conditions.push(`governorate_id = $${params.length}`);
  }
  if (type) {
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await pool.query(
      `SELECT
          f.*,
          ST_X(f.location) AS lon,
          ST_Y(f.location) AS lat,
          g.name_ar AS governorate_name
       FROM facility_occupancy f
       LEFT JOIN governorates g ON g.id = f.governorate_id
       ${where}
       ORDER BY f.occupancy_pct DESC`,
      params
    );
    return NextResponse.json({ facilities: rows });
  } catch (err) {
    console.error('[api/facilities] query failed', err);
    return NextResponse.json({ error: 'تعذّر جلب بيانات المنشآت' }, { status: 500 });
  }
}
