// المطوّر: عبدالله زايد الجسار
// قائمة المحافظات — تغذّي قوائم الفلترة ونماذج الإدخال.
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { rows } = await pool.query(
      `SELECT id, name_ar, name_en FROM governorates ORDER BY id`
    );
    return NextResponse.json({ governorates: rows });
  } catch (err) {
    console.error('[api/governorates]', err);
    return NextResponse.json({ error: 'تعذّر جلب المحافظات' }, { status: 500 });
  }
}
