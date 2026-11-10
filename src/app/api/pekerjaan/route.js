import { NextResponse } from 'next/server';
import { query, getActiveProyekId } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const proyekId = searchParams.get('proyek_id') || searchParams.get('project_id') || (await getActiveProyekId());

    if (!proyekId) {
      return NextResponse.json({ success: true, proyek: null, data: [] });
    }

    const items = await query(
      `SELECT
         id,
         project_id AS proyek_id,
         project_id,
         work_code AS kode_pekerjaan,
         work_code,
         work_name AS nama_pekerjaan,
         work_name,
         unit AS satuan,
         unit,
         volume,
         unit_price AS harga_satuan,
         unit_price,
         total_price AS total_harga,
         total_price,
         weight_percentage AS bobot_persen,
         weight_percentage
       FROM work_items
       WHERE project_id = ?
       ORDER BY
         CAST(SUBSTRING_INDEX(work_code, '.', 1) AS UNSIGNED) ASC,
         CAST(SUBSTRING_INDEX(work_code, '.', -1) AS UNSIGNED) ASC,
         work_code ASC`,
      [proyekId]
    );

    const proyekRows = await query(
      `SELECT
         id,
         project_name AS nama_proyek,
         project_name,
         location AS lokasi,
         location,
         start_date AS tgl_mulai,
         start_date,
         end_date AS tgl_selesai,
         end_date,
         total_budget AS total_anggaran,
         total_budget
       FROM projects
       WHERE id = ?
       LIMIT 1`,
      [proyekId]
    );

    return NextResponse.json({
      success: true,
      proyek: proyekRows?.[0] || null,
      data: items || [],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message, data: [], proyek: null },
      { status: 500 }
    );
  }
}
