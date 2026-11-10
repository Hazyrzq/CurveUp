import { NextResponse } from 'next/server';
import { parseRABExcel } from '@/lib/excelParser';
import { withTransaction } from '@/lib/db';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file was uploaded.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsedData = parseRABExcel(buffer);

    if (!parsedData.items_count) {
      return NextResponse.json({ success: false, message: 'No work items were found in the file.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `${parsedData.items_count} items ready to save.`,
      data: parsedData,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const items = body.items || [];
    const namaProyek = String(body.nama_proyek || body.project_name || '').trim();
    const lokasi = String(body.lokasi || body.location || '-').trim();
    const tglMulai = body.tgl_mulai || body.start_date || null;
    const tglSelesai = body.tgl_selesai || body.end_date || null;

    if (!Array.isArray(items) || !items.length) {
      return NextResponse.json({ success: false, message: 'No Cost Estimate items were provided.' }, { status: 400 });
    }

    const requestedProyekId = Number(body.proyek_id || body.project_id) || null;
    if (!requestedProyekId && !namaProyek) {
      return NextResponse.json({ success: false, message: 'Project name is required.' }, { status: 400 });
    }

    const totalAnggaran = items.reduce((sum, item) => sum + Number(item.total_harga || item.total_price || item.bobot_persen || 0), 0);

    const proyekId = await withTransaction(async (exec) => {
      let projectId = requestedProyekId;
      if (projectId) {
        const existing = await exec('SELECT id FROM projects WHERE id = ? LIMIT 1', [projectId]);
        if (!existing.length) throw new Error('Project not found.');

        await exec(
          `UPDATE projects SET project_name = ?, location = ?, start_date = ?, end_date = ?, total_budget = ? WHERE id = ?`,
          [namaProyek, lokasi, tglMulai, tglSelesai, totalAnggaran, projectId]
        );
        await exec(`DELETE FROM work_items WHERE project_id = ?`, [projectId]);
      } else {
        const project = await exec(
          `INSERT INTO projects (project_name, location, start_date, end_date, total_budget)
           VALUES (?, ?, ?, ?, ?)`,
          [namaProyek, lokasi, tglMulai, tglSelesai, totalAnggaran]
        );
        projectId = project.insertId;
      }

      for (const item of items) {
        const insertedItem = await exec(
          `INSERT INTO work_items
           (project_id, work_code, work_name, unit, volume, unit_price, total_price, weight_percentage)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            projectId,
            item.kode_pekerjaan || item.work_code,
            item.nama_pekerjaan || item.work_name,
            item.satuan || item.unit,
            item.volume,
            item.harga_satuan || item.unit_price,
            item.total_harga || item.total_price,
            item.bobot_persen || item.weight_percentage,
          ]
        );

        const itemId = insertedItem.insertId;
        const weekly = Array.isArray(item.jadwal_mingguan) ? item.jadwal_mingguan : [];
        const weekEntries = weekly
          .map((val, idx) => ({ minggu: idx + 1, bobot: Number(val) || 0 }))
          .filter((w) => w.bobot > 0);

        const weightPct = Number(item.bobot_persen || item.weight_percentage || 0);
        if (!weekEntries.length && weightPct > 0) {
          weekEntries.push({ minggu: 1, bobot: weightPct });
        }

        for (const week of weekEntries) {
          await exec(
            `INSERT INTO weekly_planned_schedules (work_item_id, week_number, planned_weekly_weight)
             VALUES (?, ?, ?)`,
            [itemId, week.minggu, week.bobot]
          );
        }
      }
      return projectId;
    });

    return NextResponse.json({
      success: true,
      message: 'Cost Estimate saved for this project. The planned S-curve has been updated.',
      proyek_id: proyekId,
      project_id: proyekId,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
