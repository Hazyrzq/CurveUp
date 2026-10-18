import { NextResponse } from 'next/server';
import { query, getActiveProyekId } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const proyekId = searchParams.get('proyek_id') || (await getActiveProyekId());

    if (!proyekId) {
      return NextResponse.json({ success: true, proyek: null, data: [] });
    }

    const items = await query(
      `SELECT id, proyek_id, kode_pekerjaan, nama_pekerjaan, satuan, volume, harga_satuan, total_harga, bobot_persen
       FROM item_pekerjaan
       WHERE proyek_id = ?
       ORDER BY
         CAST(SUBSTRING_INDEX(kode_pekerjaan, '.', 1) AS UNSIGNED) ASC,
         CAST(SUBSTRING_INDEX(kode_pekerjaan, '.', -1) AS UNSIGNED) ASC,
         kode_pekerjaan ASC`,
      [proyekId]
    );

    const proyekRows = await query(
      `SELECT id, nama_proyek, lokasi, tgl_mulai, tgl_selesai, total_anggaran
       FROM proyek
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
