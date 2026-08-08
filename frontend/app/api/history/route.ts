import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET /api/history?at=2026-08-01T14:30:00Z
// Powers the "محدد زمني" time-machine control: finds the state_snapshots
// row closest to the requested timestamp rather than requiring an exact
// match, since snapshots are taken on a fixed interval.
export async function GET(req: NextRequest) {
  const at = req.nextUrl.searchParams.get('at');
  if (!at) {
    return NextResponse.json({ error: 'مطلوب معامل at (تاريخ/وقت)' }, { status: 400 });
  }

  const targetDate = new Date(at);
  if (Number.isNaN(targetDate.getTime())) {
    return NextResponse.json({ error: 'صيغة التاريخ غير صالحة' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, captured_at, facilities_json, ambulances_json
       FROM state_snapshots
       ORDER BY ABS(EXTRACT(EPOCH FROM (captured_at - $1::timestamptz)))
       LIMIT 1`,
      [targetDate.toISOString()]
    );

    if (!rows[0]) {
      return NextResponse.json({ error: 'لا توجد سجلات محفوظة لهذا التاريخ' }, { status: 404 });
    }

    return NextResponse.json({ snapshot: rows[0] });
  } catch (err) {
    console.error('[api/history] query failed', err);
    return NextResponse.json({ error: 'تعذّر جلب السجل الزمني' }, { status: 500 });
  }
}
