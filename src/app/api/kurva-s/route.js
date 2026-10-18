import { NextResponse } from 'next/server';
import { query, getActiveProyekId } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const proyekId = searchParams.get('proyek_id') || (await getActiveProyekId());

    if (!proyekId) {
      return NextResponse.json({ success: true, labels: [], rencana: [], realisasi: [] });
    }

    const rJadwal = await query(
      `SELECT minggu_ke, SUM(target_bobot_mingguan) as total_rencana
       FROM jadwal_rencana_mingguan jrm
       JOIN item_pekerjaan ip ON jrm.item_pekerjaan_id = ip.id
       WHERE ip.proyek_id = ?
       GROUP BY minggu_ke
       ORDER BY minggu_ke ASC`,
      [proyekId]
    );

    const rRealisasi = await query(
      `SELECT minggu_ke, SUM(realisasi_bobot) as total_realisasi
       FROM laporan_progres lp
       JOIN item_pekerjaan ip ON lp.item_pekerjaan_id = ip.id
       WHERE ip.proyek_id = ? AND lp.status_verifikasi = 'approved'
       GROUP BY minggu_ke
       ORDER BY minggu_ke ASC`,
      [proyekId]
    );

    if (!rJadwal || rJadwal.length === 0) {
      return NextResponse.json({ success: true, labels: [], rencana: [], realisasi: [] });
    }

    const labels = [];
    const rencanaKumulatif = [];
    const realisasiKumulatif = [];

    let runningRencana = 0;
    let runningRealisasi = 0;

    const maxWeeks = Math.max(
      ...rJadwal.map((r) => r.minggu_ke),
      ...(rRealisasi.length ? rRealisasi.map((r) => r.minggu_ke) : [1])
    );

    const realisasiMap = {};
    rRealisasi.forEach((r) => {
      realisasiMap[r.minggu_ke] = parseFloat(r.total_realisasi || 0);
    });

    const rencanaMap = {};
    rJadwal.forEach((r) => {
      rencanaMap[r.minggu_ke] = parseFloat(r.total_rencana || 0);
    });

    const lastRealisasiWeek = rRealisasi.length
      ? Math.max(...rRealisasi.map((r) => r.minggu_ke))
      : 0;

    for (let w = 1; w <= maxWeeks; w++) {
      labels.push(`Week ${w}`);
      runningRencana += rencanaMap[w] || 0;
      rencanaKumulatif.push(Number(runningRencana.toFixed(2)));

      if (lastRealisasiWeek && w <= lastRealisasiWeek) {
        runningRealisasi += realisasiMap[w] || 0;
        realisasiKumulatif.push(Number(runningRealisasi.toFixed(2)));
      } else {
        realisasiKumulatif.push(null);
      }
    }

    return NextResponse.json({
      success: true,
      labels,
      rencana: rencanaKumulatif,
      realisasi: realisasiKumulatif,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message, labels: [], rencana: [], realisasi: [] },
      { status: 500 }
    );
  }
}
