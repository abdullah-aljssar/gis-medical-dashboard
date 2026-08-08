import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  const governorateId = req.nextUrl.searchParams.get('governorate_id');
  const params: (string | number)[] = [];
  let where = '';
  if (governorateId) {
    params.push(Number(governorateId));
    where = `WHERE governorate_id = $1`;
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, call_sign, status, assigned_facility_id,
              ST_X(location) AS lon, ST_Y(location) AS lat, updated_at
       FROM ambulances
       ${where}`,
      params
    );
    return NextResponse.json({ ambulances: rows });
  } catch (err) {
    console.error('[api/ambulances] query failed', err);
    return NextResponse.json({ error: 'تعذّر جلب بيانات سيارات الإسعاف' }, { status: 500 });
  }
}
