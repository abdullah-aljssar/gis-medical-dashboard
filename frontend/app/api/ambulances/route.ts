// المطوّر: عبدالله زايد الجسار
// جلب سيارات الإسعاف مع الفلترة حسب المحافظة — stateless.
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const governorateId = req.nextUrl.searchParams.get('governorate_id');

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (governorateId) {
    params.push(Number(governorateId));
    conditions.push(`governorate_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await pool.query(
      `SELECT id, call_sign, governorate_id, status, assigned_facility_id,
              ST_X(location) AS lon, ST_Y(location) AS lat
       FROM ambulances
       ${where}
       ORDER BY call_sign`,
      params
    );
    return NextResponse.json({ ambulances: rows });
  } catch (err) {
    console.error('[api/ambulances]', err);
    return NextResponse.json({ error: 'تعذّر جلب بيانات سيارات الإسعاف' }, { status: 500 });
  }
}
