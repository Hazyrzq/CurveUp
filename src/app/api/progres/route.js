import { NextResponse } from 'next/server';
import { query, resolveUserId, getActiveProyekId, withTransaction } from '@/lib/db';
import { deleteProgressPhoto, saveProgressPhoto } from '@/lib/progressPhoto';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const mandorId = searchParams.get('mandor_id');
    const proyekId = searchParams.get('proyek_id') || (await getActiveProyekId());

    let sql = `
      SELECT lp.id, lp.mandor_id, lp.minggu_ke, lp.tgl_laporan, lp.realisasi_volume, lp.realisasi_bobot,
             lp.status_verifikasi, lp.catatan_pengawas, lp.foto_bukti, lp.item_pekerjaan_id,
             ip.kode_pekerjaan, ip.nama_pekerjaan, ip.satuan, ip.volume as volume_target, ip.bobot_persen,
             u.nama as mandor_nama, supervisor.nama as pengawas_nama
      FROM laporan_progres lp
      JOIN item_pekerjaan ip ON lp.item_pekerjaan_id = ip.id
      LEFT JOIN users u ON lp.mandor_id = u.id
      LEFT JOIN users supervisor ON lp.pengawas_id = supervisor.id
    `;

    const params = [];
    const where = [];
    if (proyekId) {
      where.push('ip.proyek_id = ?');
      params.push(proyekId);
    }
    if (status) {
      where.push('lp.status_verifikasi = ?');
      params.push(status);
    }
    if (mandorId) {
      where.push('lp.mandor_id = ?');
      params.push(mandorId);
    }
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ` ORDER BY FIELD(lp.status_verifikasi, 'pending', 'approved', 'rejected'), lp.created_at DESC`;

    const reports = await query(sql, params);
    return NextResponse.json({ success: true, data: reports });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message, data: [] }, { status: 500 });
  }
}

export async function POST(request) {
  let savedPhoto = null;
  try {
    const formData = await request.formData();
    const itemPekerjaanId = Number(formData.get('item_pekerjaan_id'));
    const minggu = Number(formData.get('minggu_ke'));
    const persen = Number(String(formData.get('realisasi_bobot') || '').replace(',', '.'));

    if (!Number.isInteger(itemPekerjaanId) || itemPekerjaanId < 1 || !Number.isInteger(minggu) || minggu < 1 || !Number.isFinite(persen)) {
      return NextResponse.json(
        { success: false, message: 'A work item, week, and actual progress percentage are required.' },
        { status: 400 }
      );
    }

    if (persen < 0.01 || persen > 100) {
      return NextResponse.json({ success: false, message: 'Enter a percentage from 0.01 to 100.' }, { status: 400 });
    }

    const proyekId = Number(formData.get('proyek_id')) || (await getActiveProyekId());
    if (!proyekId) {
      return NextResponse.json(
        { success: false, message: 'No RAB has been uploaded. Management must upload an RAB first.' },
        { status: 400 }
      );
    }

    const mandorId = await resolveUserId('mandor', formData.get('mandor_id'));
    const photoFile = formData.get('foto_bukti');
    if (!photoFile || typeof photoFile.arrayBuffer !== 'function') {
      return NextResponse.json({ success: false, message: 'A progress photo is required.' }, { status: 400 });
    }

    const submission = await withTransaction(async (exec) => {
      const items = await exec(
        'SELECT id, volume, bobot_persen FROM item_pekerjaan WHERE id = ? AND proyek_id = ? LIMIT 1 FOR UPDATE',
        [itemPekerjaanId, proyekId]
      );
      if (!items.length) return { error: 'Work item not found.', status: 404 };

      const item = items[0];
      if (persen > Number(item.bobot_persen)) {
        return {
          error: `Progress cannot exceed the item weight (${item.bobot_persen}%).`,
          status: 400,
        };
      }

      const totals = await exec(
        `SELECT COALESCE(SUM(realisasi_bobot), 0) AS total_progress
         FROM laporan_progres
         WHERE item_pekerjaan_id = ? AND status_verifikasi IN ('pending', 'approved')`,
        [itemPekerjaanId]
      );
      const availableWeight = Number(
        (Number(item.bobot_persen) - Number(totals[0]?.total_progress || 0)).toFixed(2)
      );
      if (persen > availableWeight) {
        return {
          error: `Only ${Math.max(0, availableWeight).toFixed(2)}% weight remains for this work item. Pending and approved reports count toward its RAB weight (${item.bobot_persen}%).`,
          status: 400,
        };
      }

      const existing = await exec(
        `SELECT id FROM laporan_progres
         WHERE item_pekerjaan_id = ? AND minggu_ke = ?
           AND status_verifikasi IN ('pending', 'approved')
         LIMIT 1`,
        [itemPekerjaanId, minggu]
      );
      if (existing.length) {
        return {
          error: `A report for this work item in week ${minggu} has already been submitted. You can resubmit after it is rejected.`,
          status: 409,
        };
      }

      savedPhoto = await saveProgressPhoto(photoFile);
      const result = await exec(
        `INSERT INTO laporan_progres
         (item_pekerjaan_id, mandor_id, minggu_ke, tgl_laporan, realisasi_volume, realisasi_bobot, foto_bukti, status_verifikasi)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          itemPekerjaanId,
          mandorId,
          minggu,
          String(formData.get('tgl_laporan') || new Date().toISOString().split('T')[0]),
          persen,
          persen,
          savedPhoto,
        ]
      );
      return { id: result.insertId };
    });

    if (submission.error) {
      await deleteProgressPhoto(savedPhoto);
      return NextResponse.json(
        { success: false, message: submission.error },
        { status: submission.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Report submitted. Awaiting supervisor review.',
      id: submission.id,
    });
  } catch (error) {
    await deleteProgressPhoto(savedPhoto);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  let savedPhoto = null;
  try {
    const formData = await request.formData();
    const reportId = Number(formData.get('laporan_id'));
    const mandorId = Number(formData.get('mandor_id'));
    const itemPekerjaanId = Number(formData.get('item_pekerjaan_id'));
    const minggu = Number(formData.get('minggu_ke'));
    const persen = Number(String(formData.get('realisasi_bobot') || '').replace(',', '.'));

    if (
      !Number.isInteger(reportId) || reportId < 1 ||
      !Number.isInteger(mandorId) || mandorId < 1 ||
      !Number.isInteger(itemPekerjaanId) || itemPekerjaanId < 1 ||
      !Number.isInteger(minggu) || minggu < 1 ||
      !Number.isFinite(persen) || persen < 0.01 || persen > 100
    ) {
      return NextResponse.json({ success: false, message: 'Enter valid report details.' }, { status: 400 });
    }

    const proyekId = Number(formData.get('proyek_id')) || (await getActiveProyekId());
    if (!proyekId) {
      return NextResponse.json(
        { success: false, message: 'No RAB has been uploaded. Management must upload an RAB first.' },
        { status: 400 }
      );
    }

    const photoFile = formData.get('foto_bukti');
    const hasNewPhoto = photoFile && typeof photoFile.arrayBuffer === 'function' && photoFile.size > 0;
    const result = await withTransaction(async (exec) => {
      const reports = await exec(
        `SELECT lp.id, lp.foto_bukti, lp.item_pekerjaan_id, lp.status_verifikasi
         FROM laporan_progres lp
         JOIN item_pekerjaan ip ON ip.id = lp.item_pekerjaan_id
         WHERE lp.id = ? AND lp.mandor_id = ? AND ip.proyek_id = ?
         LIMIT 1 FOR UPDATE`,
        [reportId, mandorId, proyekId]
      );
      if (!reports.length) return { error: 'Report not found.', status: 404 };

      const report = reports[0];
      if (!['pending', 'rejected'].includes(report.status_verifikasi)) {
        return { error: 'Approved reports cannot be edited.', status: 409 };
      }

      const items = await exec(
        'SELECT id, bobot_persen FROM item_pekerjaan WHERE id = ? AND proyek_id = ? LIMIT 1 FOR UPDATE',
        [itemPekerjaanId, proyekId]
      );
      if (!items.length) return { error: 'Work item not found.', status: 404 };
      if (persen > Number(items[0].bobot_persen)) {
        return {
          error: `Progress cannot exceed the item weight (${items[0].bobot_persen}%).`,
          status: 400,
        };
      }

      const totals = await exec(
        `SELECT COALESCE(SUM(realisasi_bobot), 0) AS total_progress
         FROM laporan_progres
         WHERE item_pekerjaan_id = ?
           AND id <> ?
           AND status_verifikasi IN ('pending', 'approved')`,
        [itemPekerjaanId, reportId]
      );
      const availableWeight = Number(
        (Number(items[0].bobot_persen) - Number(totals[0]?.total_progress || 0)).toFixed(2)
      );
      if (persen > availableWeight) {
        return {
          error: `Only ${Math.max(0, availableWeight).toFixed(2)}% weight remains for this work item. Pending and approved reports count toward its RAB weight (${items[0].bobot_persen}%).`,
          status: 400,
        };
      }

      const existing = await exec(
        `SELECT id FROM laporan_progres
         WHERE item_pekerjaan_id = ? AND minggu_ke = ? AND id <> ?
           AND status_verifikasi IN ('pending', 'approved')
         LIMIT 1`,
        [itemPekerjaanId, minggu, reportId]
      );
      if (existing.length) {
        return {
          error: `A report for this work item in week ${minggu} has already been submitted.`,
          status: 409,
        };
      }

      if (!hasNewPhoto && !report.foto_bukti) {
        return { error: 'A progress photo is required.', status: 400 };
      }

      const photoPath = hasNewPhoto ? await saveProgressPhoto(photoFile) : report.foto_bukti;
      if (hasNewPhoto) savedPhoto = photoPath;
      await exec(
        `UPDATE laporan_progres
         SET item_pekerjaan_id = ?, minggu_ke = ?, tgl_laporan = ?, realisasi_volume = ?,
             realisasi_bobot = ?, foto_bukti = ?, status_verifikasi = 'pending',
             catatan_pengawas = NULL, pengawas_id = NULL
         WHERE id = ?`,
        [
          itemPekerjaanId,
          minggu,
          String(formData.get('tgl_laporan') || new Date().toISOString().split('T')[0]),
          persen,
          persen,
          photoPath,
          reportId,
        ]
      );
      return { oldPhoto: hasNewPhoto ? report.foto_bukti : null };
    });

    if (result.error) {
      await deleteProgressPhoto(savedPhoto);
      return NextResponse.json({ success: false, message: result.error }, { status: result.status });
    }
    await deleteProgressPhoto(result.oldPhoto);
    return NextResponse.json({
      success: true,
      message: 'Report updated and sent to the supervisor for review.',
    });
  } catch (error) {
    await deleteProgressPhoto(savedPhoto);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid report details.' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, message: 'Invalid report details.' }, { status: 400 });
    }

    const reportId = Number(body.laporan_id);
    const mandorId = Number(body.mandor_id);
    if (!Number.isInteger(reportId) || reportId < 1 || !Number.isInteger(mandorId) || mandorId < 1) {
      return NextResponse.json({ success: false, message: 'Invalid report details.' }, { status: 400 });
    }

    const result = await withTransaction(async (exec) => {
      const reports = await exec(
        `SELECT id, foto_bukti, status_verifikasi
         FROM laporan_progres WHERE id = ? AND mandor_id = ? LIMIT 1 FOR UPDATE`,
        [reportId, mandorId]
      );
      if (!reports.length) return { error: 'Report not found.', status: 404 };
      if (!['pending', 'rejected'].includes(reports[0].status_verifikasi)) {
        return { error: 'Approved reports cannot be deleted.', status: 409 };
      }
      await exec('DELETE FROM laporan_progres WHERE id = ?', [reportId]);
      return { photo: reports[0].foto_bukti };
    });

    if (result.error) {
      return NextResponse.json({ success: false, message: result.error }, { status: result.status });
    }
    await deleteProgressPhoto(result.photo);
    return NextResponse.json({ success: true, message: 'Report deleted.' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { laporan_id, status_verifikasi, catatan_pengawas } = body;

    if (!laporan_id || !['approved', 'rejected', 'pending'].includes(status_verifikasi)) {
      return NextResponse.json({ success: false, message: 'Invalid review data.' }, { status: 400 });
    }

    const pengawasId = await resolveUserId('pengawas', body.pengawas_id);

    await query(
      `UPDATE laporan_progres
       SET status_verifikasi = ?, catatan_pengawas = ?, pengawas_id = ?
       WHERE id = ?`,
      [status_verifikasi, catatan_pengawas || null, pengawasId, laporan_id]
    );

    const label = status_verifikasi === 'approved' ? 'approved' : status_verifikasi === 'rejected' ? 'rejected' : 'updated';

    return NextResponse.json({
      success: true,
      message: `Report ${label}.${status_verifikasi === 'approved' ? ' The actual S-curve has been updated.' : ''}`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
