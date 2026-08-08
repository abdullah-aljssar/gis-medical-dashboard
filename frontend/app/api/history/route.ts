// المطوّر: عبدالله زايد الجسار
// الآلة الزمنية — تجلب أقرب لقطة (snapshot) لتاريخ/وقت محدد في الماضي،
// لعرض توزّع السيارات ونسب الإشغال كما كانت لحظتها.
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const at = req.nextUrl.searchParams.get('at'); // ISO timestamp

  try {
    // إن لم يُحدَّد وقت، أعِد قائمة اللقطات المتاحة (للاختيار منها).
    if (!at) {
      const { rows } = await pool.query(
        `SELECT id, captured_at FROM state_snapshots ORDER BY captured_at DESC LIMIT 100`
      );
      return NextResponse.json({ snapshots: rows });
    }

    // أقرب لقطة عند/قبل الوقت المطلوب.
    const { rows } = await pool.query(
      `SELECT captured_at, facilities_json, ambulances_json
       FROM state_snapshots
       WHERE captured_at <= $1
       ORDER BY captured_at DESC
       LIMIT 1`,
      [at]
    );

    if (!rows[0]) {
      return NextResponse.json({ snapshot: null, note: 'لا توجد لقطة قبل هذا الوقت' });
    }

    return NextResponse.json({
      snapshot: {
        captured_at: rows[0].captured_at,
        facilities: rows[0].facilities_json,
        ambulances: rows[0].ambulances_json,
      },
    });
  } catch (err) {
    console.error('[api/history]', err);
    return NextResponse.json({ error: 'تعذّر جلب السجل التاريخي' }, { status: 500 });
  }
}
