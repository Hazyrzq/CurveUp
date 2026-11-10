import { NextResponse } from 'next/server';
import { withTransaction, query } from '@/lib/db';

/**
 * GET /api/seed — Returns a simple HTML page with a button to trigger the seed.
 * Open this URL in your browser to migrate & seed the remote database.
 */
export async function GET() {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Seed English Database Schema</title>
<style>
  body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;color:#e2e8f0}
  .card{background:#1e293b;border-radius:16px;padding:2rem 3rem;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.4);max-width:520px}
  h1{font-size:1.4rem;margin-bottom:.5rem}
  p{color:#94a3b8;font-size:.9rem;margin-bottom:1.5rem}
  button{background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff;border:none;padding:.75rem 2rem;border-radius:10px;font-size:1rem;cursor:pointer;font-weight:600;transition:transform .15s}
  button:hover{transform:scale(1.05)}
  button:disabled{opacity:.5;cursor:not-allowed;transform:none}
  #result{margin-top:1rem;padding:1rem;border-radius:8px;font-size:.85rem;white-space:pre-wrap;display:none;text-align:left}
  .ok{background:#064e3b;color:#6ee7b7} .err{background:#7f1d1d;color:#fca5a5}
</style></head><body>
<div class="card">
  <h1>🌱 Migrate &amp; Seed English Schema</h1>
  <p>Creates English tables (<code>users</code>, <code>projects</code>, <code>work_items</code>, <code>weekly_planned_schedules</code>, <code>progress_reports</code>), removes legacy Indonesian tables, and seeds 4 sample projects.</p>
  <button id="btn" onclick="doSeed()">Run Migration &amp; Seed</button>
  <div id="result"></div>
</div>
<script>
async function doSeed(){
  const btn=document.getElementById('btn'), res=document.getElementById('result');
  btn.disabled=true; btn.textContent='Migrating & Seeding...'; res.style.display='none';
  try{
    const r=await fetch('/api/seed',{method:'POST'});
    const j=await r.json();
    res.textContent=j.message||JSON.stringify(j);
    res.className=j.success?'ok':'err'; res.style.display='block';
  }catch(e){res.textContent=e.message;res.className='err';res.style.display='block';}
  btn.disabled=false; btn.textContent='Run Migration & Seed';
}
</script></body></html>`;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function POST() {
  try {
    // 1. Recreate schema with 100% English table & column names and drop legacy Indonesian tables
    await query('SET FOREIGN_KEY_CHECKS = 0');

    // Drop old Indonesian tables
    await query('DROP TABLE IF EXISTS laporan_progres');
    await query('DROP TABLE IF EXISTS jadwal_rencana_mingguan');
    await query('DROP TABLE IF EXISTS item_pekerjaan');
    await query('DROP TABLE IF EXISTS proyek');

    // Drop existing English tables for a clean rebuild
    await query('DROP TABLE IF EXISTS progress_reports');
    await query('DROP TABLE IF EXISTS weekly_planned_schedules');
    await query('DROP TABLE IF EXISTS work_items');
    await query('DROP TABLE IF EXISTS projects');
    await query('DROP TABLE IF EXISTS users');

    await query(`
      CREATE TABLE users (
        id INT(11) NOT NULL AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        username VARCHAR(50) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('management','supervisor','foreman') NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await query(`
      CREATE TABLE projects (
        id INT(11) NOT NULL AUTO_INCREMENT,
        project_name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        start_date DATE DEFAULT NULL,
        end_date DATE DEFAULT NULL,
        total_budget DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await query(`
      CREATE TABLE work_items (
        id INT(11) NOT NULL AUTO_INCREMENT,
        project_id INT(11) NOT NULL,
        work_code VARCHAR(20) NOT NULL,
        work_name VARCHAR(255) NOT NULL,
        unit VARCHAR(20) NOT NULL,
        volume DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        total_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        weight_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        PRIMARY KEY (id),
        KEY idx_work_items_project (project_id),
        CONSTRAINT fk_work_items_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await query(`
      CREATE TABLE weekly_planned_schedules (
        id INT(11) NOT NULL AUTO_INCREMENT,
        work_item_id INT(11) NOT NULL,
        week_number INT(11) NOT NULL,
        planned_weekly_weight DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        PRIMARY KEY (id),
        UNIQUE KEY uq_schedule_week (work_item_id, week_number),
        CONSTRAINT fk_schedule_work_item FOREIGN KEY (work_item_id) REFERENCES work_items (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await query(`
      CREATE TABLE progress_reports (
        id INT(11) NOT NULL AUTO_INCREMENT,
        work_item_id INT(11) NOT NULL,
        foreman_id INT(11) NOT NULL,
        supervisor_id INT(11) DEFAULT NULL,
        week_number INT(11) NOT NULL,
        report_date DATE NOT NULL,
        actual_volume DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        actual_weight DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        evidence_photo LONGTEXT DEFAULT NULL,
        verification_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        supervisor_notes TEXT DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_report_week (work_item_id, week_number),
        CONSTRAINT fk_report_work_item FOREIGN KEY (work_item_id) REFERENCES work_items (id) ON DELETE CASCADE,
        CONSTRAINT fk_report_foreman FOREIGN KEY (foreman_id) REFERENCES users (id),
        CONSTRAINT fk_report_supervisor FOREIGN KEY (supervisor_id) REFERENCES users (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await query('SET FOREIGN_KEY_CHECKS = 1');

    // ══════════════════════════════════════════════════════════════════
    // PROJECT 1 — On Schedule (Al-Ikhlas Mosque Renovation)
    // ══════════════════════════════════════════════════════════════════
    const rabItemsP1 = [
      { kode: '1.1', nama: 'Demolition & Site Preparation', satuan: 'ls', volume: 1,   harga: 17098000, total: 17098000,  bobot: 6.00  },
      { kode: '1.2', nama: 'Excavation & Backfilling',      satuan: 'm3', volume: 60,  harga: 190000,   total: 11400000,  bobot: 4.00  },
      { kode: '2.1', nama: 'Concrete Foundation',           satuan: 'm3', volume: 25,  harga: 1596000,  total: 39900000, bobot: 14.00 },
      { kode: '2.2', nama: 'Tie Beams & Columns',           satuan: 'm3', volume: 15,  harga: 3040000, total: 45600000, bobot: 16.00 },
      { kode: '3.1', nama: 'Brick Wall Masonry',            satuan: 'm2', volume: 180, harga: 237500,  total: 42750000, bobot: 15.00 },
      { kode: '3.2', nama: 'Wall Plastering & Skim Coat',   satuan: 'm2', volume: 360, harga: 95000,   total: 34200000, bobot: 12.00 },
      { kode: '4.1', nama: 'Roof Truss & Covering',         satuan: 'm2', volume: 120, harga: 427500,  total: 51300000, bobot: 18.00 },
      { kode: '4.2', nama: 'Finishing & Painting',          satuan: 'm2', volume: 400, harga: 106880,   total: 42752000, bobot: 15.00 },
    ];

    const weeklyPlansP1 = {
      '1.1': [[1, 4.00], [2, 2.00]],
      '1.2': [[1, 2.00], [2, 2.00]],
      '2.1': [[2, 4.00], [3, 5.00], [4, 5.00]],
      '2.2': [[3, 4.00], [4, 4.00], [5, 4.00], [6, 4.00]],
      '3.1': [[5, 3.00], [6, 4.00], [7, 4.00], [8, 4.00]],
      '3.2': [[7, 3.00], [8, 3.00], [9, 3.00], [10, 3.00]],
      '4.1': [[8, 4.00], [9, 5.00], [10, 5.00], [11, 4.00]],
      '4.2': [[10, 4.00], [11, 4.00], [12, 7.00]],
    };

    const actualReportsP1 = [
      ['1.1', 1, '2026-07-04', 4.00, 'On schedule'],
      ['1.1', 2, '2026-07-11', 2.00, 'On schedule'],
      ['1.2', 1, '2026-07-04', 2.00, 'On schedule'],
      ['1.2', 2, '2026-07-11', 2.00, 'On schedule'],
      ['2.1', 2, '2026-07-11', 4.00, 'On schedule'],
      ['2.1', 3, '2026-07-18', 5.00, 'On schedule'],
      ['2.1', 4, '2026-07-25', 5.00, 'On schedule'],
      ['2.2', 3, '2026-07-18', 4.00, 'On schedule'],
      ['2.2', 4, '2026-07-25', 4.00, 'On schedule'],
      ['2.2', 5, '2026-08-01', 4.00, 'On schedule'],
      ['2.2', 6, '2026-08-08', 4.00, 'On schedule'],
      ['3.1', 5, '2026-08-01', 3.00, 'On schedule'],
      ['3.1', 6, '2026-08-08', 4.00, 'On schedule'],
      ['3.1', 7, '2026-08-15', 4.00, 'On schedule'],
      ['3.1', 8, '2026-08-22', 4.00, 'On schedule'],
      ['3.2', 7, '2026-08-15', 3.00, 'On schedule'],
      ['3.2', 8, '2026-08-22', 3.00, 'On schedule'],
      ['3.2', 9, '2026-08-29', 3.00, 'On schedule'],
      ['3.2', 10, '2026-09-05', 3.00, 'On schedule'],
      ['4.1', 8, '2026-08-22', 4.00, 'On schedule'],
      ['4.1', 9, '2026-08-29', 5.00, 'On schedule'],
      ['4.1', 10, '2026-09-05', 5.00, 'On schedule'],
      ['4.1', 11, '2026-09-12', 4.00, 'On schedule'],
      ['4.2', 10, '2026-09-05', 4.00, 'On schedule'],
      ['4.2', 11, '2026-09-12', 4.00, 'On schedule'],
      ['4.2', 12, '2026-09-19', 7.00, 'Completed on schedule'],
    ];

    // ══════════════════════════════════════════════════════════════════
    // PROJECT 2 — Delayed / Behind Schedule (Multipurpose Hall Construction)
    // ══════════════════════════════════════════════════════════════════
    const rabItemsP2 = [
      { kode: '1.1', nama: 'Site Preparation Works',       satuan: 'ls', volume: 1,   harga: 26837770, total: 26837770,  bobot: 5.00  },
      { kode: '1.2', nama: 'Earthwork Excavation',         satuan: 'm3', volume: 120, harga: 178920,    total: 21470400,  bobot: 4.00  },
      { kode: '2.1', nama: 'Stone Masonry Foundation',     satuan: 'm3', volume: 45,  harga: 1431330,   total: 64409850,  bobot: 12.00 },
      { kode: '2.2', nama: 'Reinforced Concrete Tie Beam', satuan: 'm3', volume: 18,  harga: 2981940,  total: 53674920,  bobot: 10.00 },
      { kode: '3.1', nama: 'Reinforced Concrete Column',   satuan: 'm3', volume: 24,  harga: 3354690,  total: 80512560, bobot: 15.00 },
      { kode: '3.2', nama: 'Reinforced Concrete Beam',     satuan: 'm3', volume: 30,  harga: 2504830,  total: 75144900, bobot: 14.00 },
      { kode: '3.3', nama: 'Concrete Floor Slab',          satuan: 'm2', volume: 200, harga: 322050,   total: 64410000,  bobot: 12.00 },
      { kode: '4.1', nama: 'Lightweight Brick Wall',       satuan: 'm2', volume: 350, harga: 153360,   total: 53676000,  bobot: 10.00 },
      { kode: '4.2', nama: 'Wall Plastering & Skim Coat',  satuan: 'm2', volume: 700, harga: 61340,    total: 42938000,  bobot: 8.00  },
      { kode: '5.1', nama: 'Light Steel Roof Frame',       satuan: 'm2', volume: 220, harga: 243980,   total: 53675600,  bobot: 10.00 },
    ];

    const weeklyPlansP2 = {
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

    const actualReportsP2 = [
      ['1.1', 1, '2026-08-04', 3.00, 'Progress matches site condition'],
      ['1.1', 2, '2026-08-11', 2.00, 'Progress matches site condition'],
      ['1.2', 1, '2026-08-04', 1.50, 'Progress matches site condition'],
      ['1.2', 2, '2026-08-11', 1.50, 'Progress matches site condition'],
      ['1.2', 3, '2026-08-18', 1.00, 'Progress matches site condition'],
      ['2.1', 2, '2026-08-11', 3.00, 'Progress matches site condition'],
      ['2.1', 3, '2026-08-18', 4.50, 'Progress matches site condition'],
      ['2.1', 4, '2026-08-25', 4.50, 'Progress matches site condition'],
      ['2.2', 3, '2026-08-18', 2.50, 'Progress matches site condition'],
      ['2.2', 4, '2026-08-25', 3.00, 'Slightly delayed due to weather'],
      ['2.2', 5, '2026-09-01', 2.50, 'Catching up on schedule delay'],
      ['3.1', 4, '2026-08-25', 2.50, 'Starting to fall behind schedule'],
      ['3.1', 5, '2026-09-01', 3.00, 'Material delivery delayed'],
      ['3.1', 6, '2026-09-08', 3.00, 'Still awaiting material delivery'],
      ['3.1', 7, '2026-09-15', 2.50, 'Catching up on schedule delay'],
      ['3.2', 5, '2026-09-01', 2.00, 'Shortage of field workers'],
      ['3.2', 6, '2026-09-08', 2.50, 'Slow progress due to heavy rain'],
      ['3.2', 7, '2026-09-15', 2.00, 'Significant schedule delay persists'],
      ['3.3', 6, '2026-09-08', 2.00, 'Just started, significantly behind schedule'],
      ['3.3', 7, '2026-09-15', 1.50, 'Very slow field progress'],
      ['4.1', 7, '2026-09-15', 1.50, 'Work just started'],
      ['4.1', 8, '2026-09-22', 1.00, 'Materials not yet complete'],
    ];

    // ══════════════════════════════════════════════════════════════════
    // PROJECT 3 — Ahead of Schedule (Cikapundung Bridge Renovation)
    // ══════════════════════════════════════════════════════════════════
    const rabItemsP3 = [
      { kode: '1.1', nama: 'Site Clearing & Mobilization', satuan: 'ls',  volume: 1,   harga: 79139900, total: 79139900,  bobot: 6.00  },
      { kode: '1.2', nama: 'Temporary Cofferdam',           satuan: 'm3',  volume: 80,  harga: 824380,   total: 65950400,  bobot: 5.00  },
      { kode: '2.1', nama: 'Pile Foundation',               satuan: 'm',   volume: 200, harga: 923300,   total: 184660000,  bobot: 14.00 },
      { kode: '2.2', nama: 'Abutment Concrete',            satuan: 'm3',  volume: 60,  harga: 3517330,  total: 211039800, bobot: 16.00 },
      { kode: '3.1', nama: 'Pier Column Concrete',          satuan: 'm3',  volume: 40,  harga: 4616500,  total: 184660000, bobot: 14.00 },
      { kode: '3.2', nama: 'Steel Girder Installation',     satuan: 'ton', volume: 25,  harga: 7914000, total: 197850000, bobot: 15.00 },
      { kode: '4.1', nama: 'Bridge Deck Concrete',          satuan: 'm3',  volume: 90,  harga: 1758670,  total: 158280300, bobot: 12.00 },
      { kode: '4.2', nama: 'Railing & Safety Barrier',      satuan: 'm',   volume: 120, harga: 879330,   total: 105519600,  bobot: 8.00  },
      { kode: '5.1', nama: 'Asphalt & Finishing',           satuan: 'm2',  volume: 400, harga: 329750,   total: 131900000,  bobot: 10.00 },
    ];

    const weeklyPlansP3 = {
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

    const actualProgressP3 = {
      '1.1': [[1, 4.50], [2, 1.50]],
      '1.2': [[1, 3.00], [2, 2.00]],
      '2.1': [[2, 6.00], [3, 5.00], [4, 3.00]],
      '2.2': [[3, 5.50], [4, 6.50], [5, 4.00]],
      '3.1': [[4, 3.00], [5, 6.00], [6, 5.00]],
      '3.2': [[5, 3.00], [6, 6.00], [7, 6.00]],
      '4.1': [[6, 2.00], [7, 5.00], [8, 5.00]],
      '4.2': [[7, 2.00], [8, 4.00]],
    };

    // ══════════════════════════════════════════════════════════════════
    // PROJECT 4 — Empty / No Progress Yet (City Park Development)
    // ══════════════════════════════════════════════════════════════════
    const rabItemsP4 = [
      { kode: '1.1', nama: 'Land Survey & Marking',         satuan: 'ls',   volume: 1,    harga: 45620010,  total: 45620010,   bobot: 5.00  },
      { kode: '1.2', nama: 'Site Clearing',                 satuan: 'm2',   volume: 5000, harga: 14610,    total: 73050000,  bobot: 8.00  },
      { kode: '2.1', nama: 'Drainage & Irrigation System',  satuan: 'm',    volume: 300,  harga: 365200,   total: 109560000,  bobot: 12.00 },
      { kode: '2.2', nama: 'Pedestrian Walkway Foundation', satuan: 'm3',   volume: 80,   harga: 1141250,   total: 91300000,  bobot: 10.00 },
      { kode: '3.1', nama: 'Walkway Paving',                satuan: 'm2',   volume: 2000, harga: 68480,    total: 136960000, bobot: 15.00 },
      { kode: '3.2', nama: 'Garden & Landscape Planting',   satuan: 'm2',   volume: 3000, harga: 42610,    total: 127830000, bobot: 14.00 },
      { kode: '4.1', nama: 'Gazebo & Rest Area Structure',  satuan: 'unit', volume: 4,    harga: 27390000, total: 109560000, bobot: 12.00 },
      { kode: '4.2', nama: 'Playground Equipment',           satuan: 'set',  volume: 3,    harga: 30433330, total: 91299990, bobot: 10.00 },
      { kode: '5.1', nama: 'Lighting & Electrical',         satuan: 'ls',   volume: 1,    harga: 73040000, total: 73040000,  bobot: 8.00  },
      { kode: '5.2', nama: 'Fencing & Signage',             satuan: 'm',    volume: 500,  harga: 109560,   total: 54780000,  bobot: 6.00  },
    ];

    const weeklyPlansP4 = {
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

    await withTransaction(async (exec) => {
      // Insert default users
      await exec(
        `INSERT INTO users (id, name, username, password, role) VALUES
         (1, 'CurveUp Management', 'management', '123456', 'management'),
         (2, 'Site Supervisor', 'supervisor', '123456', 'supervisor'),
         (3, 'Lead Foreman', 'foreman', '123456', 'foreman')`
      );
      const foremanId = 3;
      const supervisorId = 2;

      async function insertProjectWithItems(id, name, location, startDate, endDate, budget, rabItems, weeklyPlans) {
        await exec(
          `INSERT INTO projects (id, project_name, location, start_date, end_date, total_budget)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, name, location, startDate, endDate, budget]
        );
        const itemIdMap = {};
        for (const item of rabItems) {
          const res = await exec(
            `INSERT INTO work_items
             (project_id, work_code, work_name, unit, volume, unit_price, total_price, weight_percentage)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, item.kode, item.nama, item.satuan, item.volume, item.harga, item.total, item.bobot]
          );
          itemIdMap[item.kode] = res.insertId;
          const weeks = weeklyPlans[item.kode] || [];
          for (const [minggu, bobot] of weeks) {
            await exec(
              `INSERT INTO weekly_planned_schedules (work_item_id, week_number, planned_weekly_weight)
               VALUES (?, ?, ?)`,
              [res.insertId, minggu, bobot]
            );
          }
        }
        return itemIdMap;
      }

      // 1. Project 1
      const p1Map = await insertProjectWithItems(
        1,
        'Al-Ikhlas Mosque Renovation',
        'Jl. Pahlawan No. 5, South Jakarta',
        '2026-07-01',
        '2026-09-23',
        285000000.0,
        rabItemsP1,
        weeklyPlansP1
      );
      for (const [kode, week, dateStr, weight, note] of actualReportsP1) {
        await exec(
          `INSERT INTO progress_reports
           (work_item_id, foreman_id, supervisor_id, week_number, report_date, actual_volume, actual_weight, verification_status, supervisor_notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?)`,
          [p1Map[kode], foremanId, supervisorId, week, dateStr, weight, weight, note]
        );
      }

      // 2. Project 2
      const p2Map = await insertProjectWithItems(
        2,
        'Multipurpose Hall Construction',
        'Jl. Merdeka No. 10, Bandung',
        '2026-08-01',
        '2026-10-24',
        536750000.0,
        rabItemsP2,
        weeklyPlansP2
      );
      for (const [kode, week, dateStr, weight, note] of actualReportsP2) {
        await exec(
          `INSERT INTO progress_reports
           (work_item_id, foreman_id, supervisor_id, week_number, report_date, actual_volume, actual_weight, verification_status, supervisor_notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?)`,
          [p2Map[kode], foremanId, supervisorId, week, dateStr, weight, weight, note]
        );
      }

      // 3. Project 3
      const p3Total = rabItemsP3.reduce((s, i) => s + i.total, 0);
      const p3Map = await insertProjectWithItems(
        3,
        'Cikapundung Bridge Renovation',
        'Jl. Braga No. 45, Bandung',
        '2026-07-15',
        '2026-10-10',
        p3Total,
        rabItemsP3,
        weeklyPlansP3
      );
      for (const [kode, progList] of Object.entries(actualProgressP3)) {
        const itemId = p3Map[kode];
        for (const [minggu, bobot] of progList) {
          const reportDate = new Date('2026-07-15');
          reportDate.setDate(reportDate.getDate() + (minggu - 1) * 7 + 3);
          const dateStr = reportDate.toISOString().split('T')[0];
          await exec(
            `INSERT INTO progress_reports
             (work_item_id, foreman_id, supervisor_id, week_number, report_date, actual_volume, actual_weight, verification_status, supervisor_notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?)`,
            [itemId, foremanId, supervisorId, minggu, dateStr, bobot, bobot, 'Progress verified on-site — ahead of weekly target']
          );
        }
      }

      // 4. Project 4
      const p4Total = rabItemsP4.reduce((s, i) => s + i.total, 0);
      await insertProjectWithItems(
        4,
        'City Park Development',
        'Jl. Asia Afrika No. 22, Bandung',
        '2026-09-01',
        '2026-11-21',
        p4Total,
        rabItemsP4,
        weeklyPlansP4
      );
    });

    return NextResponse.json({
      success: true,
      message: [
        'English database schema migration & seed complete!',
        'Tables in kurvas_curveup: users, projects, work_items, weekly_planned_schedules, progress_reports.',
        '• Project 1 — Al-Ikhlas Mosque Renovation (On Schedule)',
        '• Project 2 — Multipurpose Hall Construction (Behind Schedule)',
        '• Project 3 — Cikapundung Bridge Renovation (Ahead of Schedule)',
        '• Project 4 — City Park Development (Empty / No Progress Yet)',
      ].join('\n'),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `Seed failed: ${error.message}` },
      { status: 500 }
    );
  }
}
