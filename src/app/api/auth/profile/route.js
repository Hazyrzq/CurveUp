import { NextResponse } from 'next/server';
import { query, resolveUserId, DB_TO_APP_ROLE } from '@/lib/db';

export async function PUT(request) {
  try {
    const body = await request.json();
    const id = await resolveUserId(body.role || 'manajemen', body.id);
    const nama = String(body.nama || body.name || '').trim();
    const username = String(body.username || '').trim();
    const password = String(body.password || '');

    if (!id || !nama || !username) {
      return NextResponse.json({ success: false, message: 'Name and username are required.' }, { status: 400 });
    }

    const taken = await query('SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1', [username, id]);
    if (taken.length) {
      return NextResponse.json({ success: false, message: 'That username is already in use.' }, { status: 400 });
    }

    if (password) {
      await query('UPDATE users SET name = ?, username = ?, password = ? WHERE id = ?', [nama, username, password, id]);
    } else {
      await query('UPDATE users SET name = ?, username = ? WHERE id = ?', [nama, username, id]);
    }

    const rows = await query('SELECT id, name AS nama, name, username, role FROM users WHERE id = ? LIMIT 1', [id]);
    const user = rows[0]
      ? {
          ...rows[0],
          role: DB_TO_APP_ROLE[rows[0].role] || rows[0].role,
        }
      : null;
    return NextResponse.json({ success: true, message: 'Profile saved.', user });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
