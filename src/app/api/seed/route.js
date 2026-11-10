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
 * Cleans up duplicate seeded projects and inserts:
 * 1. Cikapundung Bridge Renovation — Ahead of Schedule (+19% at Week 8, ~2 weeks ahead)
 * 2. City Park Development — Empty (no progress reports yet, for manual input)
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
    // PROJECT 1 — Ahead of Schedule 🚀 (English)
    // Cumulative Planned W1..W8: 5, 12.5, 21, 29, 39.5, 51, 59, 69
    // Cumulative Actual  W1..W8: 7.5, 17, 27.5, 40, 53, 66, 79, 88 (+19%, ~2 weeks ahead)
    // ══════════════════════════════════════════════════════════════════
    const rabItemsAhead = [
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

    const weeklyPlansAhead = {
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

    const actualProgressAhead = {
      '1.1': [[1, 4.50], [2, 1.50]],                           // 6.00 / 6.00 (completed W2)
      '1.2': [[1, 3.00], [2, 2.00]],                           // 5.00 / 5.00 (completed W2, 1 week early)
      '2.1': [[2, 6.00], [3, 5.00], [4, 3.00]],                // 14.00 / 14.00 (completed W4, 1 week early)
      '2.2': [[3, 5.50], [4, 6.50], [5, 4.00]],                // 16.00 / 16.00 (completed W5, 1 week early)
      '3.1': [[4, 3.00], [5, 6.00], [6, 5.00]],                // 14.00 / 14.00 (completed W6, 2 weeks early)
      '3.2': [[5, 3.00], [6, 6.00], [7, 6.00]],                // 15.00 / 15.00 (completed W7, 2 weeks early)
      '4.1': [[6, 2.00], [7, 5.00], [8, 5.00]],                // 12.00 / 12.00 (completed W8, 3 weeks early)
      '4.2': [[7, 2.00], [8, 4.00]],                           // 6.00 / 8.00 (started early, 75% done by W8)
    };

    // ══════════════════════════════════════════════════════════════════
    // PROJECT 2 — Empty (for user to fill in) 📝 (English)
    // ══════════════════════════════════════════════════════════════════
    const rabItemsEmpty = [
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

    const weeklyPlansEmpty = {
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
              [itemId, mandorId, pengawasId, minggu, dateStr, bobot, bobot, 'Progress verified on-site — ahead of weekly target']
            );
          }
        }
      }

      return pid;
    }

    // ── Execute cleanup + seed in a transaction ───────────────────────
    const projectIds = await withTransaction(async (exec) => {
      // 0. Translate default user display names to English
      await exec(`UPDATE users SET nama = 'CurveUp Management' WHERE role = 'manajemen'`);
      await exec(`UPDATE users SET nama = 'Site Supervisor' WHERE role = 'pengawas'`);
      await exec(`UPDATE users SET nama = 'Lead Foreman' WHERE role = 'mandor'`);

      // 1. Translate Project 1 (On Schedule) to English
      await exec(
        `UPDATE proyek SET nama_proyek = 'Al-Ikhlas Mosque Renovation', lokasi = 'Jl. Pahlawan No. 5, South Jakarta' WHERE id = 1`
      );
      const p1Translations = [
        ['1.1', 'Demolition & Site Preparation'],
        ['1.2', 'Excavation & Backfilling'],
        ['2.1', 'Concrete Foundation'],
        ['2.2', 'Tie Beams & Columns'],
        ['3.1', 'Brick Wall Masonry'],
        ['3.2', 'Wall Plastering & Skim Coat'],
        ['4.1', 'Roof Truss & Covering'],
        ['4.2', 'Finishing & Painting'],
      ];
      for (const [kode, enName] of p1Translations) {
        await exec(
          `UPDATE item_pekerjaan SET nama_pekerjaan = ? WHERE proyek_id = 1 AND kode_pekerjaan = ?`,
          [enName, kode]
        );
      }

      // 2. Translate Project 2 (Delayed / Behind Schedule) to English
      await exec(
        `UPDATE proyek SET nama_proyek = 'Multipurpose Hall Construction', lokasi = 'Jl. Merdeka No. 10, Bandung' WHERE id = 2`
      );
      const p2Translations = [
        ['1.1', 'Site Preparation Works'],
        ['1.2', 'Earthwork Excavation'],
        ['2.1', 'Stone Masonry Foundation'],
        ['2.2', 'Reinforced Concrete Tie Beam'],
        ['3.1', 'Reinforced Concrete Column'],
        ['3.2', 'Reinforced Concrete Beam'],
        ['3.3', 'Concrete Floor Slab'],
        ['4.1', 'Lightweight Brick Wall'],
        ['4.2', 'Wall Plastering & Skim Coat'],
        ['5.1', 'Light Steel Roof Frame'],
      ];
      for (const [kode, enName] of p2Translations) {
        await exec(
          `UPDATE item_pekerjaan SET nama_pekerjaan = ? WHERE proyek_id = 2 AND kode_pekerjaan = ?`,
          [enName, kode]
        );
      }

      // 3. Translate supervisor review notes on existing reports to English
      const noteTranslations = [
        ['Sesuai jadwal', 'On schedule'],
        ['Selesai tepat waktu', 'Completed on schedule'],
        ['Progres sesuai lapangan', 'Progress matches site condition'],
        ['Sedikit terlambat karena cuaca', 'Slightly delayed due to weather'],
        ['Mengejar keterlambatan', 'Catching up on schedule delay'],
        ['Mulai terlambat', 'Starting to fall behind schedule'],
        ['Material terlambat datang', 'Material delivery delayed'],
        ['Masih menunggu material', 'Still awaiting material delivery'],
        ['Kurang tenaga kerja', 'Shortage of field workers'],
        ['Progres lambat karena hujan', 'Slow progress due to heavy rain'],
        ['Masih delay signifikan', 'Significant schedule delay persists'],
        ['Baru mulai, sangat terlambat', 'Just started, significantly behind schedule'],
        ['Progres sangat lambat', 'Very slow field progress'],
        ['Baru dimulai', 'Work just started'],
        ['Material belum lengkap', 'Materials not yet complete'],
      ];
      for (const [idNote, enNote] of noteTranslations) {
        await exec(
          `UPDATE laporan_progres SET catatan_pengawas = ? WHERE catatan_pengawas = ?`,
          [enNote, idNote]
        );
      }

      // Remove duplicate seeded projects (keep original projects id <= 2)
      await exec(
        `DELETE lp FROM laporan_progres lp
         JOIN item_pekerjaan ip ON lp.item_pekerjaan_id = ip.id
         WHERE ip.proyek_id > 2`
      );
      await exec(
        `DELETE jrm FROM jadwal_rencana_mingguan jrm
         JOIN item_pekerjaan ip ON jrm.item_pekerjaan_id = ip.id
         WHERE ip.proyek_id > 2`
      );
      await exec(`DELETE FROM item_pekerjaan WHERE proyek_id > 2`);
      await exec(`DELETE FROM proyek WHERE id > 2`);

      const idAhead = await seedProject(exec, {
        nama: 'Cikapundung Bridge Renovation',
        lokasi: 'Jl. Braga No. 45, Bandung',
        tglMulai: '2026-07-15',
        tglSelesai: '2026-10-10',
        rabItems: rabItemsAhead,
        weeklyPlans: weeklyPlansAhead,
        actualProgress: actualProgressAhead,
      });

      const idEmpty = await seedProject(exec, {
        nama: 'City Park Development',
        lokasi: 'Jl. Asia Afrika No. 22, Bandung',
        tglMulai: '2026-09-01',
        tglSelesai: '2026-11-21',
        rabItems: rabItemsEmpty,
        weeklyPlans: weeklyPlansEmpty,
        actualProgress: null, // Empty — no progress reports
      });

      return { idAhead, idEmpty };
    });

    return NextResponse.json({
      success: true,
      message: [
        `Seed complete! Duplicate projects cleaned up and 2 English projects created:`,
        `• Project ${projectIds.idAhead} — Cikapundung Bridge Renovation (Ahead of Schedule: 88% actual vs 69% planned at W8)`,
        `• Project ${projectIds.idEmpty} — City Park Development (Empty / No Progress Yet)`,
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
