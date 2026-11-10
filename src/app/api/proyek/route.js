import { NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { deleteProgressPhoto } from '@/lib/progressPhoto';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get('q') || '').trim();

    let sql = `
      SELECT
        p.id,
        p.project_name AS nama_proyek,
        p.project_name,
        p.location AS lokasi,
        p.location,
        p.start_date AS tgl_mulai,
        p.start_date,
        p.end_date AS tgl_selesai,
        p.end_date,
        p.total_budget AS total_anggaran,
        p.total_budget,
        (SELECT COUNT(*) FROM work_items wi WHERE wi.project_id = p.id) AS rab_count
      FROM projects p
    `;
    const params = [];
    if (q) {
      sql += ` WHERE p.project_name LIKE ? OR p.location LIKE ?`;
      params.push(`%${q}%`, `%${q}%`);
    }
    sql += ` ORDER BY p.id DESC`;

    const data = await query(sql, params);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message, data: [] }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const nama = String(body.nama_proyek || body.project_name || '').trim();
    if (!nama) {
      return NextResponse.json({ success: false, message: 'Project name is required.' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO projects (project_name, location, start_date, end_date, total_budget)
       VALUES (?, ?, ?, ?, 0)`,
      [
        nama,
        String(body.lokasi || body.location || '-').trim(),
        body.tgl_mulai || body.start_date || null,
        body.tgl_selesai || body.end_date || null,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Project created.',
      id: result.insertId,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const projectId = Number(body.id || body.proyek_id || body.project_id);
    const projectName = String(body.nama_proyek || body.project_name || '').trim();
    const location = String(body.lokasi || body.location || '-').trim() || '-';
    const startDate = body.tgl_mulai || body.start_date || null;
    const endDate = body.tgl_selesai || body.end_date || null;

    if (!Number.isInteger(projectId) || projectId < 1) {
      return NextResponse.json({ success: false, message: 'A valid project ID is required.' }, { status: 400 });
    }
    if (!projectName) {
      return NextResponse.json({ success: false, message: 'Project name is required.' }, { status: 400 });
    }

    const existing = await query('SELECT id FROM projects WHERE id = ? LIMIT 1', [projectId]);
    if (!existing.length) {
      return NextResponse.json({ success: false, message: 'Project not found.' }, { status: 404 });
    }

    await query(
      `UPDATE projects
       SET project_name = ?, location = ?, start_date = ?, end_date = ?
       WHERE id = ?`,
      [projectName, location, startDate, endDate, projectId]
    );

    return NextResponse.json({
      success: true,
      message: 'Project details updated.',
      id: projectId,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const { searchParams } = new URL(request.url);
    const projectId = Number(
      body?.id || body?.proyek_id || body?.project_id || searchParams.get('id') || searchParams.get('proyek_id')
    );

    if (!Number.isInteger(projectId) || projectId < 1) {
      return NextResponse.json({ success: false, message: 'A valid project ID is required.' }, { status: 400 });
    }

    const result = await withTransaction(async (exec) => {
      const existing = await exec(
        'SELECT id, project_name FROM projects WHERE id = ? LIMIT 1 FOR UPDATE',
        [projectId]
      );
      if (!existing.length) {
        return { error: 'Project not found.', status: 404 };
      }

      const photoRows = await exec(
        `SELECT pr.evidence_photo
         FROM progress_reports pr
         JOIN work_items wi ON pr.work_item_id = wi.id
         WHERE wi.project_id = ? AND pr.evidence_photo IS NOT NULL`,
        [projectId]
      );

      await exec(
        `DELETE pr FROM progress_reports pr
         JOIN work_items wi ON pr.work_item_id = wi.id
         WHERE wi.project_id = ?`,
        [projectId]
      );
      await exec(
        `DELETE wps FROM weekly_planned_schedules wps
         JOIN work_items wi ON wps.work_item_id = wi.id
         WHERE wi.project_id = ?`,
        [projectId]
      );
      await exec('DELETE FROM work_items WHERE project_id = ?', [projectId]);
      await exec('DELETE FROM projects WHERE id = ?', [projectId]);

      return {
        projectName: existing[0].project_name,
        photos: photoRows.map((r) => r.evidence_photo).filter(Boolean),
      };
    });

    if (result.error) {
      return NextResponse.json({ success: false, message: result.error }, { status: result.status });
    }

    for (const photo of result.photos || []) {
      await deleteProgressPhoto(photo);
    }

    return NextResponse.json({
      success: true,
      message: `Project "${result.projectName}" has been deleted.`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
