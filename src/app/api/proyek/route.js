import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get('q') || '').trim();

    let sql = `
      SELECT p.id, p.nama_proyek, p.lokasi, p.tgl_mulai, p.tgl_selesai, p.total_anggaran,
        (SELECT COUNT(*) FROM item_pekerjaan ip WHERE ip.proyek_id = p.id) AS rab_count
      FROM proyek p
    `;
    const params = [];
    if (q) {
      sql += ` WHERE p.nama_proyek LIKE ? OR p.lokasi LIKE ?`;
      params.push(`%${q}%`, `%${q}%`);
    }
    sql += ` ORDER BY p.id DESC`;

    const data = await query(sql, params);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message, data: [] }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const nama = String(body.nama_proyek || '').trim();
    if (!nama) {
      return NextResponse.json({ success: false, message: 'Project name is required.' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO proyek (nama_proyek, lokasi, tgl_mulai, tgl_selesai, total_anggaran)
       VALUES (?, ?, ?, ?, 0)`,
      [nama, String(body.lokasi || '-').trim(), body.tgl_mulai || null, body.tgl_selesai || null]
    );

    return NextResponse.json({
      success: true,
      message: 'Project created.',
      id: result.insertId,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
