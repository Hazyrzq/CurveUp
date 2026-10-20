import { NextResponse } from 'next/server';
import { withTransaction, query } from '@/lib/db';

/**
 * POST /api/seed
 *
 * Seeds the database with a realistic construction project containing:
 * - 1 project (Proyek Pembangunan Gedung Serbaguna)
 * - 10 RAB items with varying weights
 * - 12-week planned schedule (jadwal_rencana_mingguan)
 * - Progress reports: some on-track, some delayed
 *
 * The result is a clearly visible gap between the planned S-curve and
 * the actual S-curve, demonstrating both on-time and delayed items.
 *
 * ⚠️  This endpoint is for development / demo purposes only.
 */
export async function POST() {
  try {
    // ── 1. Resolve user IDs ──────────────────────────────────────────
    const mandorRows = await query(
      "SELECT id FROM users WHERE role = 'mandor' LIMIT 1"
    );
    const pengawasRows = await query(
      "SELECT id FROM users WHERE role = 'pengawas' LIMIT 1"
    );

    if (!mandorRows.length || !pengawasRows.length) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Seed requires at least one user with role "mandor" and one with role "pengawas". Please create them first.',
        },
        { status: 400 }
      );
    }

    const mandorId = mandorRows[0].id;
    const pengawasId = pengawasRows[0].id;

    // ── 2. RAB Items ─────────────────────────────────────────────────
    // 10 items whose bobot_persen sums to exactly 100%
    const rabItems = [
      { kode: '1.1', nama: 'Pekerjaan Persiapan',          satuan: 'ls',  volume: 1,    harga: 15000000,  total: 15000000,  bobot: 5.00  },
      { kode: '1.2', nama: 'Galian Tanah',                 satuan: 'm3',  volume: 120,  harga: 85000,     total: 10200000,  bobot: 4.00  },
      { kode: '2.1', nama: 'Pondasi Batu Kali',            satuan: 'm3',  volume: 45,   harga: 650000,    total: 29250000,  bobot: 12.00 },
      { kode: '2.2', nama: 'Sloof Beton Bertulang',        satuan: 'm3',  volume: 18,   harga: 3500000,   total: 63000000,  bobot: 10.00 },
      { kode: '3.1', nama: 'Kolom Beton Bertulang',        satuan: 'm3',  volume: 24,   harga: 4200000,   total: 100800000, bobot: 15.00 },
      { kode: '3.2', nama: 'Balok Beton Bertulang',        satuan: 'm3',  volume: 30,   harga: 4000000,   total: 120000000, bobot: 14.00 },
      { kode: '3.3', nama: 'Plat Lantai Beton',            satuan: 'm2',  volume: 200,  harga: 350000,    total: 70000000,  bobot: 12.00 },
      { kode: '4.1', nama: 'Dinding Bata Ringan',          satuan: 'm2',  volume: 350,  harga: 120000,    total: 42000000,  bobot: 10.00 },
      { kode: '4.2', nama: 'Plesteran & Acian',            satuan: 'm2',  volume: 700,  harga: 45000,     total: 31500000,  bobot: 8.00  },
      { kode: '5.1', nama: 'Atap Rangka Baja Ringan',      satuan: 'm2',  volume: 220,  harga: 250000,    total: 55000000,  bobot: 10.00 },
    ];

    // ── 3. Planned weekly schedule ───────────────────────────────────
    // Each item spreads its bobot across a subset of the 12 weeks.
    // Format: [weekNumber, percentageOfBobot]
    const weeklyPlans = {
      '1.1': [[1, 3.00], [2, 2.00]],
      '1.2': [[1, 1.50], [2, 1.50], [3, 1.00]],
      '2.1': [[2, 3.00], [3, 4.50], [4, 4.50]],
      '2.2': [[3, 2.50], [4, 3.50], [5, 4.00]],
      '3.1': [[4, 3.00], [5, 4.00], [6, 4.00], [7, 4.00]],
      '3.2': [[5, 3.00], [6, 3.50], [7, 3.50], [8, 4.00]],
      '3.3': [[6, 3.00], [7, 3.00], [8, 3.00], [9, 3.00]],
      '4.1': [[7, 2.50], [8, 2.50], [9, 2.50], [10, 2.50]],
      '4.2': [[9, 2.00], [10, 2.00], [11, 2.00], [12, 2.00]],
      '5.1': [[9, 2.00], [10, 2.50], [11, 2.50], [12, 3.00]],
    };

    // ── 4. Actual progress (realisasi) ───────────────────────────────
    // Some items are on-track, some are delayed.
    // Format: [weekNumber, realisasiBobot]
    // Items 1.1, 1.2, 2.1 → mostly on-track
    // Items 2.2, 3.1 → slightly delayed
    // Items 3.2, 3.3 → significantly delayed
    // Items 4.1 → partially done
    // Items 4.2, 5.1 → not yet started
    const actualProgress = {
      // ✅ ON-TRACK
      '1.1': [[1, 3.00], [2, 2.00]],                            // 100% of bobot done
      '1.2': [[1, 1.50], [2, 1.50], [3, 1.00]],                 // 100% of bobot done
      '2.1': [[2, 3.00], [3, 4.50], [4, 4.50]],                 // 100% of bobot done

      // ⚠️ SLIGHTLY DELAYED
      '2.2': [[3, 2.50], [4, 3.00], [5, 2.50]],                 // 80% → missing 2%
      '3.1': [[4, 2.50], [5, 3.00], [6, 3.00], [7, 2.50]],      // 73.3% → missing 4%

      // 🔴 SIGNIFICANTLY DELAYED
      '3.2': [[5, 2.00], [6, 2.50], [7, 2.00]],                 // 46.4% → missing 7.5%
      '3.3': [[6, 2.00], [7, 1.50]],                             // 29.2% → missing 8.5%

      // 🟡 PARTIAL
      '4.1': [[7, 1.50], [8, 1.00]],                             // 25% → still progressing

      // ❌ NOT STARTED
      // '4.2': [],
      // '5.1': [],
    };

    // ── 5. Execute seed in a transaction ─────────────────────────────
    const proyekId = await withTransaction(async (exec) => {
      // Create project
      const tglMulai = '2026-08-01';
      const tglSelesai = '2026-10-24';  // ~12 weeks
      const totalAnggaran = rabItems.reduce((s, i) => s + i.total, 0);

      const prj = await exec(
        `INSERT INTO proyek (nama_proyek, lokasi, tgl_mulai, tgl_selesai, total_anggaran)
         VALUES (?, ?, ?, ?, ?)`,
        ['Pembangunan Gedung Serbaguna', 'Jl. Merdeka No. 10, Bandung', tglMulai, tglSelesai, totalAnggaran]
      );
      const pid = prj.insertId;

      // Insert RAB items + weekly plans
      const itemIdMap = {};
      for (const item of rabItems) {
        const res = await exec(
          `INSERT INTO item_pekerjaan
           (proyek_id, kode_pekerjaan, nama_pekerjaan, satuan, volume, harga_satuan, total_harga, bobot_persen)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [pid, item.kode, item.nama, item.satuan, item.volume, item.harga, item.total, item.bobot]
        );
        itemIdMap[item.kode] = res.insertId;

        // Insert planned schedule
        const weeks = weeklyPlans[item.kode] || [];
        for (const [minggu, bobot] of weeks) {
          await exec(
            `INSERT INTO jadwal_rencana_mingguan (item_pekerjaan_id, minggu_ke, target_bobot_mingguan)
             VALUES (?, ?, ?)`,
            [res.insertId, minggu, bobot]
          );
        }
      }

      // Insert progress reports (approved)
      for (const [kode, progList] of Object.entries(actualProgress)) {
        const itemId = itemIdMap[kode];
        if (!itemId) continue;

        for (const [minggu, bobot] of progList) {
          // Calculate a plausible date
          const reportDate = new Date('2026-08-01');
          reportDate.setDate(reportDate.getDate() + (minggu - 1) * 7 + 3); // mid-week
          const dateStr = reportDate.toISOString().split('T')[0];

          await exec(
            `INSERT INTO laporan_progres
             (item_pekerjaan_id, mandor_id, pengawas_id, minggu_ke, tgl_laporan,
              realisasi_volume, realisasi_bobot, status_verifikasi, catatan_pengawas)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?)`,
            [
              itemId,
              mandorId,
              pengawasId,
              minggu,
              dateStr,
              bobot,
              bobot,
              'Progres sesuai lapangan',
            ]
          );
        }
      }

      return pid;
    });

    return NextResponse.json({
      success: true,
      message: `Seed data berhasil! Proyek ID: ${proyekId}. 10 item RAB, 12 minggu jadwal, dan laporan progres (delay & on-track) telah dimasukkan.`,
      proyek_id: proyekId,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `Seed gagal: ${error.message}` },
      { status: 500 }
    );
  }
}
