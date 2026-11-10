import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get('q') || '').trim();

    let sql = `
      SELECT
        p.id,
        p.project_name AS nama_proyek,
        p.project_name,
        p.location AS lokasi,
        p.location,
        p.start_date AS tgl_mulai,
        p.start_date,
        p.end_date AS tgl_selesai,
        p.end_date,
        p.total_budget AS total_anggaran,
        p.total_budget,
        (SELECT COUNT(*) FROM work_items wi WHERE wi.project_id = p.id) AS rab_count
      FROM projects p
    `;
    const params = [];
    if (q) {
      sql += ` WHERE p.project_name LIKE ? OR p.location LIKE ?`;
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
    const nama = String(body.nama_proyek || body.project_name || '').trim();
    if (!nama) {
      return NextResponse.json({ success: false, message: 'Project name is required.' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO projects (project_name, location, start_date, end_date, total_budget)
       VALUES (?, ?, ?, ?, 0)`,
      [
        nama,
        String(body.lokasi || body.location || '-').trim(),
        body.tgl_mulai || body.start_date || null,
        body.tgl_selesai || body.end_date || null,
      ]
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
