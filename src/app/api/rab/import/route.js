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
    const namaProyek = String(body.nama_proyek || '').trim();
    const lokasi = String(body.lokasi || '-').trim();
    const tglMulai = body.tgl_mulai || null;
    const tglSelesai = body.tgl_selesai || null;

    if (!Array.isArray(items) || !items.length) {
      return NextResponse.json({ success: false, message: 'No RAB items were provided.' }, { status: 400 });
    }

    const requestedProyekId = Number(body.proyek_id) || null;
    if (!requestedProyekId && !namaProyek) {
      return NextResponse.json({ success: false, message: 'Project name is required.' }, { status: 400 });
    }

    const totalAnggaran = items.reduce((sum, item) => sum + Number(item.bobot_persen || 0), 0);

    const proyekId = await withTransaction(async (exec) => {
      let projectId = requestedProyekId;
      if (projectId) {
        const existing = await exec('SELECT id FROM proyek WHERE id = ? LIMIT 1', [projectId]);
        if (!existing.length) throw new Error('Project not found.');

        await exec(
          `UPDATE proyek SET nama_proyek = ?, lokasi = ?, tgl_mulai = ?, tgl_selesai = ?, total_anggaran = ? WHERE id = ?`,
          [namaProyek, lokasi, tglMulai, tglSelesai, totalAnggaran, projectId]
        );
        await exec(`DELETE FROM item_pekerjaan WHERE proyek_id = ?`, [projectId]);
      } else {
        const project = await exec(
          `INSERT INTO proyek (nama_proyek, lokasi, tgl_mulai, tgl_selesai, total_anggaran)
           VALUES (?, ?, ?, ?, ?)`,
          [namaProyek, lokasi, tglMulai, tglSelesai, totalAnggaran]
        );
        projectId = project.insertId;
      }

      for (const item of items) {
        const insertedItem = await exec(
          `INSERT INTO item_pekerjaan
           (proyek_id, kode_pekerjaan, nama_pekerjaan, satuan, volume, harga_satuan, total_harga, bobot_persen)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            projectId,
            item.kode_pekerjaan,
            item.nama_pekerjaan,
            item.satuan,
            item.volume,
            item.harga_satuan,
            item.total_harga,
            item.bobot_persen,
          ]
        );

        const itemId = insertedItem.insertId;
        const weekly = Array.isArray(item.jadwal_mingguan) ? item.jadwal_mingguan : [];
        const weekEntries = weekly
          .map((val, idx) => ({ minggu: idx + 1, bobot: Number(val) || 0 }))
          .filter((w) => w.bobot > 0);

        if (!weekEntries.length && Number(item.bobot_persen) > 0) {
          weekEntries.push({ minggu: 1, bobot: Number(item.bobot_persen) });
        }

        for (const week of weekEntries) {
          await exec(
            `INSERT INTO jadwal_rencana_mingguan (item_pekerjaan_id, minggu_ke, target_bobot_mingguan)
             VALUES (?, ?, ?)`,
            [itemId, week.minggu, week.bobot]
          );
        }
      }
      return projectId;
    });

    return NextResponse.json({
      success: true,
      message: 'RAB saved for this project. The planned S-curve has been updated.',
      proyek_id: proyekId,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
