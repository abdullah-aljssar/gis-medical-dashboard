// المطوّر: عبدالله زايد الجسار
// جلب المنشآت مع الفلترة حسب المحافظة/النوع — stateless (مناسبة لـ serverless).
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
      `SELECT id, name, type, governorate_id, governorate_name,
              total_beds, occupied_beds, available_beds, occupancy_pct,
              status, lon, lat, updated_at
       FROM facility_occupancy
       ${where}
       ORDER BY occupancy_pct DESC`,
      params
    );
    return NextResponse.json({ facilities: rows });
  } catch (err) {
    console.error('[api/facilities]', err);
    return NextResponse.json({ error: 'تعذّر جلب بيانات المنشآت' }, { status: 500 });
  }
}
