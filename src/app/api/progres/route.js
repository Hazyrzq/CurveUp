import { NextResponse } from 'next/server';
import { query, resolveUserId, getActiveProyekId, withTransaction } from '@/lib/db';
import { deleteProgressPhoto, saveProgressPhoto } from '@/lib/progressPhoto';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const mandorIdParam = searchParams.get('mandor_id') || searchParams.get('foreman_id');
    const proyekId = searchParams.get('proyek_id') || searchParams.get('project_id');
    const mandorId =
      mandorIdParam !== null ? await resolveUserId('foreman', mandorIdParam) : null;

    let sql = `
      SELECT
        pr.id,
        pr.foreman_id AS mandor_id,
        pr.foreman_id,
        pr.week_number AS minggu_ke,
        pr.week_number,
        pr.report_date AS tgl_laporan,
        pr.report_date,
        pr.actual_volume AS realisasi_volume,
        pr.actual_volume,
        pr.actual_weight AS realisasi_bobot,
        pr.actual_weight,
        pr.verification_status AS status_verifikasi,
        pr.verification_status,
        pr.supervisor_notes AS catatan_pengawas,
        pr.supervisor_notes,
        pr.evidence_photo AS foto_bukti,
        pr.evidence_photo,
        pr.work_item_id AS item_pekerjaan_id,
        pr.work_item_id,
        wi.project_id AS proyek_id,
        wi.project_id,
        p.project_name AS nama_proyek,
        p.project_name,
        wi.work_code AS kode_pekerjaan,
        wi.work_code,
        wi.work_name AS nama_pekerjaan,
        wi.work_name,
        wi.unit AS satuan,
        wi.unit,
        wi.volume AS volume_target,
        wi.weight_percentage AS bobot_persen,
        wi.weight_percentage,
        u.name AS mandor_nama,
        supervisor.name AS pengawas_nama
      FROM progress_reports pr
      JOIN work_items wi ON pr.work_item_id = wi.id
      JOIN projects p ON wi.project_id = p.id
      LEFT JOIN users u ON pr.foreman_id = u.id
      LEFT JOIN users supervisor ON pr.supervisor_id = supervisor.id
    `;

    const params = [];
    const where = [];
    if (proyekId) {
      where.push('wi.project_id = ?');
      params.push(proyekId);
    }
    if (status) {
      where.push('pr.verification_status = ?');
      params.push(status);
    }
    if (mandorId) {
      where.push('pr.foreman_id = ?');
      params.push(mandorId);
    }
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ` ORDER BY FIELD(pr.verification_status, 'pending', 'approved', 'rejected'), pr.created_at DESC`;

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
    const itemPekerjaanId = Number(formData.get('item_pekerjaan_id') || formData.get('work_item_id'));
    const minggu = Number(formData.get('minggu_ke') || formData.get('week_number'));
    const persen = Number(String(formData.get('realisasi_bobot') || formData.get('actual_weight') || '').replace(',', '.'));

    if (!Number.isInteger(itemPekerjaanId) || itemPekerjaanId < 1 || !Number.isInteger(minggu) || minggu < 1 || !Number.isFinite(persen)) {
      return NextResponse.json(
        { success: false, message: 'A work item, week, and actual progress percentage are required.' },
        { status: 400 }
      );
    }

    if (persen < 0.01 || persen > 100) {
      return NextResponse.json({ success: false, message: 'Enter a percentage from 0.01 to 100.' }, { status: 400 });
    }

    const proyekId = Number(formData.get('proyek_id') || formData.get('project_id')) || (await getActiveProyekId());
    if (!proyekId) {
      return NextResponse.json(
        { success: false, message: 'No Cost Estimate has been uploaded. Management must upload a Cost Estimate first.' },
        { status: 400 }
      );
    }

    const mandorId = await resolveUserId('foreman', formData.get('mandor_id') || formData.get('foreman_id'));
    const photoFile = formData.get('foto_bukti') || formData.get('evidence_photo');
    if (!photoFile || typeof photoFile.arrayBuffer !== 'function') {
      return NextResponse.json({ success: false, message: 'A progress photo is required.' }, { status: 400 });
    }

    const submission = await withTransaction(async (exec) => {
      const items = await exec(
        'SELECT id, volume, weight_percentage AS bobot_persen FROM work_items WHERE id = ? AND project_id = ? LIMIT 1 FOR UPDATE',
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
        `SELECT COALESCE(SUM(actual_weight), 0) AS total_progress
         FROM progress_reports
         WHERE work_item_id = ? AND verification_status IN ('pending', 'approved')`,
        [itemPekerjaanId]
      );
      const availableWeight = Number(
        (Number(item.bobot_persen) - Number(totals[0]?.total_progress || 0)).toFixed(2)
      );
      if (persen > availableWeight) {
        return {
          error: `Only ${Math.max(0, availableWeight).toFixed(2)}% weight remains for this work item. Pending and approved reports count toward its Cost Estimate weight (${item.bobot_persen}%).`,
          status: 400,
        };
      }

      const existing = await exec(
        `SELECT id FROM progress_reports
         WHERE work_item_id = ? AND week_number = ?
           AND verification_status IN ('pending', 'approved')
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
        `INSERT INTO progress_reports
         (work_item_id, foreman_id, week_number, report_date, actual_volume, actual_weight, evidence_photo, verification_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          itemPekerjaanId,
          mandorId,
          minggu,
          String(formData.get('tgl_laporan') || formData.get('report_date') || new Date().toISOString().split('T')[0]),
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
    const reportId = Number(formData.get('laporan_id') || formData.get('report_id'));
    const mandorId = await resolveUserId('foreman', formData.get('mandor_id') || formData.get('foreman_id'));
    const itemPekerjaanId = Number(formData.get('item_pekerjaan_id') || formData.get('work_item_id'));
    const minggu = Number(formData.get('minggu_ke') || formData.get('week_number'));
    const persen = Number(String(formData.get('realisasi_bobot') || formData.get('actual_weight') || '').replace(',', '.'));

    if (
      !Number.isInteger(reportId) || reportId < 1 ||
      !Number.isInteger(mandorId) || mandorId < 1 ||
      !Number.isInteger(itemPekerjaanId) || itemPekerjaanId < 1 ||
      !Number.isInteger(minggu) || minggu < 1 ||
      !Number.isFinite(persen) || persen < 0.01 || persen > 100
    ) {
      return NextResponse.json({ success: false, message: 'Enter valid report details.' }, { status: 400 });
    }

    const proyekId = Number(formData.get('proyek_id') || formData.get('project_id')) || (await getActiveProyekId());
    if (!proyekId) {
      return NextResponse.json(
        { success: false, message: 'No Cost Estimate has been uploaded. Management must upload a Cost Estimate first.' },
        { status: 400 }
      );
    }

    const photoFile = formData.get('foto_bukti') || formData.get('evidence_photo');
    const hasNewPhoto = photoFile && typeof photoFile.arrayBuffer === 'function' && photoFile.size > 0;
    const result = await withTransaction(async (exec) => {
      const reports = await exec(
        `SELECT pr.id, pr.evidence_photo AS foto_bukti, pr.work_item_id AS item_pekerjaan_id, pr.verification_status AS status_verifikasi
         FROM progress_reports pr
         JOIN work_items wi ON wi.id = pr.work_item_id
         WHERE pr.id = ? AND pr.foreman_id = ? AND wi.project_id = ?
         LIMIT 1 FOR UPDATE`,
        [reportId, mandorId, proyekId]
      );
      if (!reports.length) return { error: 'Report not found.', status: 404 };

      const report = reports[0];
      if (!['pending', 'rejected'].includes(report.status_verifikasi)) {
        return { error: 'Approved reports cannot be edited.', status: 409 };
      }

      const items = await exec(
        'SELECT id, weight_percentage AS bobot_persen FROM work_items WHERE id = ? AND project_id = ? LIMIT 1 FOR UPDATE',
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
        `SELECT COALESCE(SUM(actual_weight), 0) AS total_progress
         FROM progress_reports
         WHERE work_item_id = ?
           AND id <> ?
           AND verification_status IN ('pending', 'approved')`,
        [itemPekerjaanId, reportId]
      );
      const availableWeight = Number(
        (Number(items[0].bobot_persen) - Number(totals[0]?.total_progress || 0)).toFixed(2)
      );
      if (persen > availableWeight) {
        return {
          error: `Only ${Math.max(0, availableWeight).toFixed(2)}% weight remains for this work item. Pending and approved reports count toward its Cost Estimate weight (${items[0].bobot_persen}%).`,
          status: 400,
        };
      }

      const existing = await exec(
        `SELECT id FROM progress_reports
         WHERE work_item_id = ? AND week_number = ? AND id <> ?
           AND verification_status IN ('pending', 'approved')
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
        `UPDATE progress_reports
         SET work_item_id = ?, week_number = ?, report_date = ?, actual_volume = ?,
             actual_weight = ?, evidence_photo = ?, verification_status = 'pending',
             supervisor_notes = NULL, supervisor_id = NULL
         WHERE id = ?`,
        [
          itemPekerjaanId,
          minggu,
          String(formData.get('tgl_laporan') || formData.get('report_date') || new Date().toISOString().split('T')[0]),
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

    const reportId = Number(body.laporan_id || body.report_id);
    const mandorId = await resolveUserId('foreman', body.mandor_id || body.foreman_id);
    if (!Number.isInteger(reportId) || reportId < 1 || !Number.isInteger(mandorId) || mandorId < 1) {
      return NextResponse.json({ success: false, message: 'Invalid report details.' }, { status: 400 });
    }

    const result = await withTransaction(async (exec) => {
      const reports = await exec(
        `SELECT id, evidence_photo AS foto_bukti, verification_status AS status_verifikasi
         FROM progress_reports WHERE id = ? AND foreman_id = ? LIMIT 1 FOR UPDATE`,
        [reportId, mandorId]
      );
      if (!reports.length) return { error: 'Report not found.', status: 404 };
      if (!['pending', 'rejected'].includes(reports[0].status_verifikasi)) {
        return { error: 'Approved reports cannot be deleted.', status: 409 };
      }
      await exec('DELETE FROM progress_reports WHERE id = ?', [reportId]);
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
    const laporanId = body.laporan_id || body.report_id;
    const statusVerifikasi = body.status_verifikasi || body.verification_status;
    const catatanPengawas = body.catatan_pengawas ?? body.supervisor_notes ?? null;

    if (!laporanId || !['approved', 'rejected', 'pending'].includes(statusVerifikasi)) {
      return NextResponse.json({ success: false, message: 'Invalid review data.' }, { status: 400 });
    }

    const pengawasId = await resolveUserId('supervisor', body.pengawas_id || body.supervisor_id);

    await query(
      `UPDATE progress_reports
       SET verification_status = ?, supervisor_notes = ?, supervisor_id = ?
       WHERE id = ?`,
      [statusVerifikasi, catatanPengawas || null, pengawasId, laporanId]
    );

    const label = statusVerifikasi === 'approved' ? 'approved' : statusVerifikasi === 'rejected' ? 'rejected' : 'updated';

    return NextResponse.json({
      success: true,
      message: `Report ${label}.${statusVerifikasi === 'approved' ? ' The actual S-curve has been updated.' : ''}`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
