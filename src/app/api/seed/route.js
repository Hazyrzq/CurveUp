import { NextResponse } from 'next/server';
import { withTransaction, query } from '@/lib/db';

/**
 * GET /api/seed — Returns a simple HTML page with a button to trigger the seed.
 * Open this URL in your browser to seed the remote database.
 */
export async function GET() {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Seed Data</title>
<style>
  body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;color:#e2e8f0}
  .card{background:#1e293b;border-radius:16px;padding:2rem 3rem;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.4)}
  h1{font-size:1.4rem;margin-bottom:.5rem}
  p{color:#94a3b8;font-size:.9rem;margin-bottom:1.5rem}
  button{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;padding:.75rem 2rem;border-radius:10px;font-size:1rem;cursor:pointer;font-weight:600;transition:transform .15s}
  button:hover{transform:scale(1.05)}
  button:disabled{opacity:.5;cursor:not-allowed;transform:none}
  #result{margin-top:1rem;padding:1rem;border-radius:8px;font-size:.85rem;white-space:pre-wrap;display:none}
  .ok{background:#064e3b;color:#6ee7b7} .err{background:#7f1d1d;color:#fca5a5}
</style></head><body>
<div class="card">
  <h1>🌱 Seed Demo Data</h1>
  <p>Insert sample projects: Delayed &amp; On-Track, Ahead of Schedule, and an empty project</p>
  <button id="btn" onclick="doSeed()">Insert Seed Data</button>
  <div id="result"></div>
</div>
<script>
async function doSeed(){
  const btn=document.getElementById('btn'), res=document.getElementById('result');
  btn.disabled=true; btn.textContent='Seeding...'; res.style.display='none';
  try{
    const r=await fetch('/api/seed',{method:'POST'});
    const j=await r.json();
    res.textContent=j.message||JSON.stringify(j);
    res.className=j.success?'ok':'err'; res.style.display='block';
  }catch(e){res.textContent=e.message;res.className='err';res.style.display='block';}
  btn.disabled=false; btn.textContent='Insert Seed Data';
}
</script></body></html>`;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

/**
 * POST /api/seed
 *
 * Seeds the database with three construction projects:
 *
 * 1. Pembangunan Gedung Serbaguna — mixed on-track and delayed items
 * 2. Renovasi Jembatan Cikapundung — ahead of schedule
 * 3. Pembangunan Taman Kota — empty (no progress reports, for manual input)
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

    // ══════════════════════════════════════════════════════════════════
    // PROJECT 1 — Delayed & On-Track (existing)
    // ══════════════════════════════════════════════════════════════════
    const rabItems1 = [
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

    const weeklyPlans1 = {
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

    const actualProgress1 = {
      // ✅ ON-TRACK
      '1.1': [[1, 3.00], [2, 2.00]],
      '1.2': [[1, 1.50], [2, 1.50], [3, 1.00]],
      '2.1': [[2, 3.00], [3, 4.50], [4, 4.50]],
      // ⚠️ SLIGHTLY DELAYED
      '2.2': [[3, 2.50], [4, 3.00], [5, 2.50]],
      '3.1': [[4, 2.50], [5, 3.00], [6, 3.00], [7, 2.50]],
      // 🔴 SIGNIFICANTLY DELAYED
      '3.2': [[5, 2.00], [6, 2.50], [7, 2.00]],
      '3.3': [[6, 2.00], [7, 1.50]],
      // 🟡 PARTIAL
      '4.1': [[7, 1.50], [8, 1.00]],
      // ❌ NOT STARTED
      // '4.2': [],
      // '5.1': [],
    };

    // ══════════════════════════════════════════════════════════════════
    // PROJECT 2 — Ahead of Schedule 🚀
    // ══════════════════════════════════════════════════════════════════
    const rabItems2 = [
      { kode: '1.1', nama: 'Site Clearing & Mobilization',      satuan: 'ls',  volume: 1,    harga: 25000000,  total: 25000000,  bobot: 6.00  },
      { kode: '1.2', nama: 'Temporary Cofferdam',                satuan: 'm3',  volume: 80,   harga: 200000,    total: 16000000,  bobot: 5.00  },
      { kode: '2.1', nama: 'Pile Foundation',                    satuan: 'm',   volume: 200,  harga: 450000,    total: 90000000,  bobot: 14.00 },
      { kode: '2.2', nama: 'Abutment Concrete',                 satuan: 'm3',  volume: 60,   harga: 3800000,   total: 228000000, bobot: 16.00 },
      { kode: '3.1', nama: 'Pier Column Concrete',               satuan: 'm3',  volume: 40,   harga: 4500000,   total: 180000000, bobot: 14.00 },
      { kode: '3.2', nama: 'Steel Girder Installation',          satuan: 'ton', volume: 25,   harga: 15000000,  total: 375000000, bobot: 15.00 },
      { kode: '4.1', nama: 'Bridge Deck Concrete',               satuan: 'm3',  volume: 90,   harga: 3500000,   total: 315000000, bobot: 12.00 },
      { kode: '4.2', nama: 'Railing & Safety Barrier',           satuan: 'm',   volume: 120,  harga: 350000,    total: 42000000,  bobot: 8.00  },
      { kode: '5.1', nama: 'Asphalt & Finishing',                satuan: 'm2',  volume: 400,  harga: 120000,    total: 48000000,  bobot: 10.00 },
    ];

    const weeklyPlans2 = {
      '1.1': [[1, 3.50], [2, 2.50]],
      '1.2': [[1, 1.50], [2, 2.00], [3, 1.50]],
      '2.1': [[2, 3.00], [3, 4.00], [4, 4.00], [5, 3.00]],
      '2.2': [[3, 3.00], [4, 4.00], [5, 4.50], [6, 4.50]],
      '3.1': [[5, 3.00], [6, 4.00], [7, 4.00], [8, 3.00]],
      '3.2': [[6, 3.00], [7, 4.00], [8, 4.00], [9, 4.00]],
      '4.1': [[8, 3.00], [9, 3.00], [10, 3.00], [11, 3.00]],
      '4.2': [[9, 2.00], [10, 2.00], [11, 2.00], [12, 2.00]],
      '5.1': [[10, 2.50], [11, 3.50], [12, 4.00]],
    };

    // Actual progress EXCEEDS plan at most points → Ahead of Schedule
    const actualProgress2 = {
      // 🚀 COMPLETED FASTER THAN PLANNED
      '1.1': [[1, 4.00], [2, 2.00]],                           // Done in week 2 (planned: end week 2) — 100% done
      '1.2': [[1, 2.50], [2, 2.50]],                           // Done in week 2 (planned: end week 3) — 1 week early
      '2.1': [[2, 4.00], [3, 5.00], [4, 5.00]],                // Done in week 4 (planned: end week 5) — 1 week early
      '2.2': [[3, 4.00], [4, 5.00], [5, 5.00], [6, 2.00]],    // Done in week 6 (on plan) but each week ahead
      // 🚀 AHEAD OF SCHEDULE
      '3.1': [[5, 4.00], [6, 5.00], [7, 5.00]],                // Done in week 7 (planned: end week 8) — 1 week early
      '3.2': [[6, 4.00], [7, 5.00], [8, 5.00]],                // 93% by week 8 (planned: end week 9) — tracking ahead
      '4.1': [[8, 4.00], [9, 4.00]],                            // 67% by week 9 (planned: end week 11) — well ahead
    };

    // ══════════════════════════════════════════════════════════════════
    // PROJECT 3 — Empty (for user to fill in) 📝
    // ══════════════════════════════════════════════════════════════════
    const rabItems3 = [
      { kode: '1.1', nama: 'Land Survey & Marking',            satuan: 'ls',  volume: 1,    harga: 8000000,   total: 8000000,   bobot: 5.00  },
      { kode: '1.2', nama: 'Site Clearing',                    satuan: 'm2',  volume: 5000, harga: 15000,     total: 75000000,  bobot: 8.00  },
      { kode: '2.1', nama: 'Drainage & Irrigation System',     satuan: 'm',   volume: 300,  harga: 250000,    total: 75000000,  bobot: 12.00 },
      { kode: '2.2', nama: 'Pedestrian Walkway Foundation',    satuan: 'm3',  volume: 80,   harga: 500000,    total: 40000000,  bobot: 10.00 },
      { kode: '3.1', nama: 'Walkway Paving',                   satuan: 'm2',  volume: 2000, harga: 85000,     total: 170000000, bobot: 15.00 },
      { kode: '3.2', nama: 'Garden & Landscape Planting',      satuan: 'm2',  volume: 3000, harga: 45000,     total: 135000000, bobot: 14.00 },
      { kode: '4.1', nama: 'Gazebo & Rest Area Structure',     satuan: 'unit',volume: 4,    harga: 35000000,  total: 140000000, bobot: 12.00 },
      { kode: '4.2', nama: 'Playground Equipment',              satuan: 'set', volume: 3,    harga: 50000000,  total: 150000000, bobot: 10.00 },
      { kode: '5.1', nama: 'Lighting & Electrical',            satuan: 'ls',  volume: 1,    harga: 60000000,  total: 60000000,  bobot: 8.00  },
      { kode: '5.2', nama: 'Fencing & Signage',                satuan: 'm',   volume: 500,  harga: 120000,    total: 60000000,  bobot: 6.00  },
    ];

    const weeklyPlans3 = {
      '1.1': [[1, 3.00], [2, 2.00]],
      '1.2': [[1, 2.00], [2, 3.00], [3, 3.00]],
      '2.1': [[2, 2.00], [3, 4.00], [4, 4.00], [5, 2.00]],
      '2.2': [[3, 2.50], [4, 3.50], [5, 4.00]],
      '3.1': [[4, 2.00], [5, 3.00], [6, 4.00], [7, 3.00], [8, 3.00]],
      '3.2': [[5, 2.00], [6, 3.00], [7, 3.00], [8, 3.00], [9, 3.00]],
      '4.1': [[7, 3.00], [8, 3.00], [9, 3.00], [10, 3.00]],
      '4.2': [[8, 2.50], [9, 2.50], [10, 2.50], [11, 2.50]],
      '5.1': [[10, 2.00], [11, 3.00], [12, 3.00]],
      '5.2': [[10, 1.50], [11, 2.00], [12, 2.50]],
    };

    // No actual progress — empty project for manual input

    // ── Helper: Insert one project ────────────────────────────────────
    async function seedProject(exec, { nama, lokasi, tglMulai, tglSelesai, rabItems, weeklyPlans, actualProgress }) {
      const totalAnggaran = rabItems.reduce((s, i) => s + i.total, 0);
      const prj = await exec(
        `INSERT INTO proyek (nama_proyek, lokasi, tgl_mulai, tgl_selesai, total_anggaran)
         VALUES (?, ?, ?, ?, ?)`,
        [nama, lokasi, tglMulai, tglSelesai, totalAnggaran]
      );
      const pid = prj.insertId;

      const itemIdMap = {};
      for (const item of rabItems) {
        const res = await exec(
          `INSERT INTO item_pekerjaan
           (proyek_id, kode_pekerjaan, nama_pekerjaan, satuan, volume, harga_satuan, total_harga, bobot_persen)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [pid, item.kode, item.nama, item.satuan, item.volume, item.harga, item.total, item.bobot]
        );
        itemIdMap[item.kode] = res.insertId;

        const weeks = weeklyPlans[item.kode] || [];
        for (const [minggu, bobot] of weeks) {
          await exec(
            `INSERT INTO jadwal_rencana_mingguan (item_pekerjaan_id, minggu_ke, target_bobot_mingguan)
             VALUES (?, ?, ?)`,
            [res.insertId, minggu, bobot]
          );
        }
      }

      if (actualProgress) {
        for (const [kode, progList] of Object.entries(actualProgress)) {
          const itemId = itemIdMap[kode];
          if (!itemId) continue;
          for (const [minggu, bobot] of progList) {
            const reportDate = new Date(tglMulai);
            reportDate.setDate(reportDate.getDate() + (minggu - 1) * 7 + 3);
            const dateStr = reportDate.toISOString().split('T')[0];
            await exec(
              `INSERT INTO laporan_progres
               (item_pekerjaan_id, mandor_id, pengawas_id, minggu_ke, tgl_laporan,
                realisasi_volume, realisasi_bobot, status_verifikasi, catatan_pengawas)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?)`,
              [itemId, mandorId, pengawasId, minggu, dateStr, bobot, bobot, 'Progress verified on-site']
            );
          }
        }
      }

      return pid;
    }

    // ── 5. Execute seed in a transaction ─────────────────────────────
    const projectIds = await withTransaction(async (exec) => {
      const id1 = await seedProject(exec, {
        nama: 'Pembangunan Gedung Serbaguna',
        lokasi: 'Jl. Merdeka No. 10, Bandung',
        tglMulai: '2026-08-01',
        tglSelesai: '2026-10-24',
        rabItems: rabItems1,
        weeklyPlans: weeklyPlans1,
        actualProgress: actualProgress1,
      });

      const id2 = await seedProject(exec, {
        nama: 'Renovasi Jembatan Cikapundung',
        lokasi: 'Jl. Braga No. 45, Bandung',
        tglMulai: '2026-07-15',
        tglSelesai: '2026-10-10',
        rabItems: rabItems2,
        weeklyPlans: weeklyPlans2,
        actualProgress: actualProgress2,
      });

      const id3 = await seedProject(exec, {
        nama: 'Pembangunan Taman Kota',
        lokasi: 'Jl. Asia Afrika No. 22, Bandung',
        tglMulai: '2026-09-01',
        tglSelesai: '2026-11-21',
        rabItems: rabItems3,
        weeklyPlans: weeklyPlans3,
        actualProgress: null, // Empty — no progress reports
      });

      return { id1, id2, id3 };
    });

    return NextResponse.json({
      success: true,
      message: [
        `Seed complete! 3 projects created:`,
        `• Project ${projectIds.id1} — Delayed & On-Track (10 items, 12 weeks)`,
        `• Project ${projectIds.id2} — Ahead of Schedule (9 items, 12 weeks)`,
        `• Project ${projectIds.id3} — Empty / No Progress (10 items, 12 weeks)`,
      ].join('\n'),
      project_ids: projectIds,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `Seed gagal: ${error.message}` },
      { status: 500 }
    );
  }
}
